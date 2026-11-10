# frozen_string_literal: true

# Only webhook builds refresh Strapi. Git/Decap builds keep their offline export.
require "jekyll"
require "base64"
require_relative "../../_plugins/strapi_v5"

module PortfolioProjectSync
  REPOSITORY = "rapsamaniego27/portfolio-2020"
  BRANCH = "master"
  MODELS = %w(project category technology collaborator).freeze

  def self.webhook_build?(env)
    return false unless env["NETLIFY"] == "true" && env["CONTEXT"] == "production" &&
                        env["BRANCH"] == BRANCH && !env["INCOMING_HOOK_URL"].to_s.empty?

    # Netlify URL-encodes the webhook body. Never execute or log its contents.
    body = env["INCOMING_HOOK_BODY"].to_s
    payload = body.empty? ? {} : JSON.parse(body.lstrip.start_with?("{") ? body : URI.decode_www_form_component(body))
    raise "The project webhook body must be a JSON object." unless payload.is_a?(Hash)

    model = payload["model"]
    uid = payload["uid"]
    return false if model && !MODELS.include?(model)
    return false if uid && !MODELS.any? { |name| uid == "api::#{name}.#{name}" }

    true # Empty/manual hook tests also refresh the complete public export.
  rescue JSON::ParserError, ArgumentError
    raise "The project webhook body is not valid JSON. Saved projects were not changed."
  end

  class GitHubSnapshot
    def initialize(token, api_base: "https://api.github.com")
      @token = token
      @base = URI(api_base)
    end

    def request(method, query: nil, body: nil)
      uri = @base.dup
      uri.path = "/repos/#{REPOSITORY}/contents/#{PortfolioV5::SNAPSHOT_FILE}"
      uri.query = query && URI.encode_www_form(query)
      headers = {
        "Accept" => "application/vnd.github+json", "Authorization" => "Bearer #{@token}",
        "X-GitHub-Api-Version" => "2022-11-28", "User-Agent" => "Rap-portfolio-project-sync",
      }
      request = method.new(uri, headers)
      if body
        request["Content-Type"] = "application/json"
        request.body = JSON.generate(body)
      end
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == "https"
      http.open_timeout = 10
      http.read_timeout = 30
      http.max_retries = 0
      http.request(request)
    end

    def publish(contents)
      response = request(Net::HTTP::Get, query: { "ref" => BRANCH })
      unless response.code == "200"
        raise "GitHub snapshot read returned HTTP #{response.code}. Check PORTFOLIO_SNAPSHOT_TOKEN and repository access."
      end
      remote = JSON.parse(response.body)
      unless remote["type"] == "file" && remote["sha"].is_a?(String) && remote["encoding"] == "base64"
        raise "GitHub did not return the saved snapshot file."
      end
      return :unchanged if Base64.decode64(remote.fetch("content")).b == contents.b

      response = request(Net::HTTP::Put, body: {
        # This build already publishes the new JSON; avoid a second build loop.
        "message" => "Update portfolio projects [skip netlify]", "branch" => BRANCH,
        "sha" => remote["sha"], "content" => Base64.strict_encode64(contents),
      })
      return :conflict if response.code == "409"
      unless %w(200 201).include?(response.code)
        raise "GitHub snapshot save returned HTTP #{response.code}. The build stopped before publishing unpersisted projects."
      end
      payload = JSON.parse(response.body)
      raise "GitHub did not confirm the snapshot commit." unless payload.dig("commit", "sha").is_a?(String)

      :saved
    rescue JSON::ParserError, KeyError
      raise "GitHub returned an invalid snapshot response. Saved projects were not replaced locally."
    rescue Net::OpenTimeout, Net::ReadTimeout, SocketError, SystemCallError, EOFError, IOError, OpenSSL::SSL::SSLError
      raise "GitHub snapshot persistence is unavailable. The build stopped; the existing live site is unchanged."
    end
  end

  def self.run(site, env: ENV, publisher: nil, fetcher: PortfolioV5.method(:fetch_snapshot))
    unless webhook_build?(env)
      Jekyll.logger.info "Projects:", "Using the committed export; this is not a production portfolio webhook build."
      return :offline
    end
    token = env["PORTFOLIO_SNAPSHOT_TOKEN"].to_s.strip
    raise "Set PORTFOLIO_SNAPSHOT_TOKEN in Netlify production build settings (portfolio-2020, Contents: read/write)." if token.empty?
    raise "PORTFOLIO_SNAPSHOT_TOKEN contains invalid whitespace." if token.match?(/\s/)

    PortfolioV5.read_snapshot(site)
    publisher ||= GitHubSnapshot.new(token)
    3.times do
      # Refetch after a conflicting save so a delayed build cannot retry stale data.
      data = fetcher.call(site)
      raise "The fresh project export is invalid." unless PortfolioV5.valid_snapshot?(data)

      result = publisher.publish(JSON.pretty_generate(data) + "\n")
      next if result == :conflict

      # Persist to GitHub first. Jekyll can then safely publish the identical data.
      PortfolioV5.write_snapshot(site, data)
      Jekyll.logger.info "Projects:", "GitHub snapshot #{result}: #{data['projects'].size} projects, #{data['categories'].size} categories."
      return result
    end
    raise "The GitHub snapshot changed repeatedly. Retry the webhook build; no stale export was published."
  end
end

if $PROGRAM_NAME == __FILE__
  begin
    root = File.expand_path("../..", __dir__)
    # No site.process: the existing Liquid build runs once, after durable saving.
    site = Jekyll::Site.new(Jekyll.configuration("source" => root, "quiet" => false))
    PortfolioProjectSync.run(site)
  rescue StandardError => error
    warn "Project refresh failed: #{error.message}"
    exit 1
  end
end
