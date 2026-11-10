# frozen_string_literal: true

# Data flow: Strapi -> _data/strapi_projects.json -> Liquid -> /projects.json.
# Local jekyll serve refreshes the export; normal builds read it offline.
# Netlify's hook-build script saves fresh exports to GitHub before rendering.
require "jekyll-strapi"
require "json"
require "uri"
require "net/http"
require "fileutils"
require "openssl"

module PortfolioV5
  # This file belongs in Git so deployments work even with Heroku disabled.
  SNAPSHOT_FILE = "_data/strapi_projects.json"
  COLLECTIONS = %w(projects categories).freeze

  def self.local_preview?(site)
    site.config["serving"] && Jekyll.env == "development" && ENV["NETLIFY"] != "true"
  end

  def self.api_uri(site)
    # Optional local override when refreshing from a hosted v5 instead of localhost.
    configured = ENV["STRAPI_API_URL"].to_s.strip
    configured = site.config.dig("strapi", "endpoint").to_s if configured.empty?
    begin
      uri = URI.parse(configured)
    rescue URI::InvalidURIError
      raise "STRAPI_API_URL must be a valid Strapi v5 API URL."
    end
    local = %w(localhost 127.0.0.1 ::1 [::1]).include?(uri.host)
    unless uri.host && uri.userinfo.nil? && uri.query.nil? && uri.fragment.nil? &&
           %w(/api /api/).include?(uri.path) && (uri.scheme == "https" || (local && uri.scheme == "http"))
      raise "STRAPI_API_URL must end in /api and use HTTPS (HTTP loopback is allowed locally), without credentials, query or fragment."
    end
    uri.path = uri.path.sub(%r{/+$}, "")
    uri
  end

  def self.query_pairs(value, prefix = nil)
    # Convert nested options into Strapi query keys, e.g. populate[gallery]=true.
    case value
    when Hash
      value.flat_map { |key, child| query_pairs(child, prefix ? "#{prefix}[#{key}]" : key.to_s) }
    when Array
      value.each_with_index.flat_map { |child, index| query_pairs(child, "#{prefix}[#{index}]") }
    else
      [[prefix, value.to_s]]
    end
  end

  def self.request_page(uri, collection, local: false)
    attempts = local ? 1 : 3
    reason = nil
    (1..attempts).each do |attempt|
      begin
        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = uri.scheme == "https"
        http.open_timeout = 5
        http.read_timeout = local ? 10 : 45
        http.max_retries = 0
        response = http.request(Net::HTTP::Get.new(uri.request_uri, "Accept" => "application/json"))
        if response.code == "200"
          begin
            return JSON.parse(response.body)
          rescue JSON::ParserError
            raise "Strapi #{collection} returned invalid JSON."
          end
        end
        unless %w(502 503 504).include?(response.code)
          raise "Strapi #{collection} returned HTTP #{response.code}. Check the v5 API URL and Public read permissions."
        end
        reason = "HTTP #{response.code}"
      rescue Net::OpenTimeout, Net::ReadTimeout, SocketError, SystemCallError, EOFError, IOError, OpenSSL::SSL::SSLError => error
        reason = error.class.to_s
      end
      break if attempt == attempts

      Jekyll.logger.warn "Strapi v5:", "#{collection}: #{reason}; retrying in #{attempt * 5}s (#{attempt + 1}/#{attempts})."
      sleep(attempt * 5)
    end
    raise "Strapi #{collection} is unavailable: #{reason} after #{attempts} attempt(s). Fresh data could not be fetched."
  end

  def self.fetch_collection(site, collection, query)
    endpoint = api_uri(site)
    records = []
    seen = {}
    total = pages = nil
    # Read every page and reject duplicates/partial results before saving anything.
    (1..1000).each do |page|
      uri = endpoint.dup
      uri.path += "/#{collection}"
      uri.query = URI.encode_www_form(query_pairs(query.merge("pagination" => { "page" => page, "pageSize" => 100 })))
      Jekyll.logger.info "Strapi v5:", "Fetching #{collection}, page #{page}"
      payload = request_page(uri, collection, :local => local_preview?(site))
      rows = payload["data"]
      pagination = payload.dig("meta", "pagination")
      unless rows.is_a?(Array) && pagination.is_a?(Hash) && pagination["total"].is_a?(Integer) && pagination["total"] >= 0 &&
             pagination["pageCount"].is_a?(Integer) && pagination["pageCount"].between?(0, 1000)
        raise "Strapi #{collection} returned invalid records or pagination."
      end
      total ||= pagination["total"]
      pages ||= pagination["pageCount"]
      unless pagination["total"] == total && pagination["pageCount"] == pages
        raise "Strapi #{collection} changed during pagination. Rebuild to fetch a consistent list."
      end
      rows.each do |record|
        id = record.is_a?(Hash) && record["documentId"]
        raise "Strapi #{collection} returned a missing or duplicate documentId." unless id.is_a?(String) && !id.empty? && !seen[id]

        seen[id] = true
        records << record
      end
      if page >= pages
        raise "Strapi #{collection} returned an incomplete list." unless records.size == total

        return records
      end
      raise "Strapi #{collection} returned an empty intermediate page." if rows.empty?
    end
    raise "Strapi #{collection} pagination limit exceeded."
  end

  def self.category(record)
    key = record["key"].to_s.empty? ? record["slug"] : record["key"]
    unless key.is_a?(String) && key.match?(/\A[A-Za-z][A-Za-z0-9_-]{0,63}\z/) &&
           record["name"].is_a?(String) && !record["name"].strip.empty? &&
           record["slug"].is_a?(String) && !record["slug"].empty? &&
           record["display_order"].is_a?(Integer) && record["display_order"] >= 0
      raise "A Strapi category has an invalid name, key, slug or display order."
    end
    {
      "id" => record["documentId"],
      "key" => key,
      "name" => record["name"],
      "slug" => record["slug"],
      "display_order" => record["display_order"],
    }
  end

  def self.image(record)
    begin
      uri = URI.parse(record.fetch("url"))
      valid = uri.scheme == "https" && uri.host && uri.userinfo.nil? && !%w(localhost 127.0.0.1 ::1 [::1]).include?(uri.host)
    rescue KeyError, NoMethodError, TypeError, URI::InvalidURIError
      valid = false
    end
    raise "Project images need public HTTPS URLs, such as the existing Cloudinary URLs." unless valid

    { "url" => record["url"] }
  end

  def self.project(record, categories)
    # Prefer the Category relation; keep the old type value as a migration fallback.
    selected = if record["category"]
                 categories.find { |entry| entry["id"] == record["category"]["documentId"] }
               else
                 categories.find { |entry| entry["key"] == record["type"] }
               end
    raise "A project has no matching Category. Assign its Category in Strapi before rebuilding." unless selected
    %w(gallery technologies collaborators).each do |field|
      raise "Project #{field} was not populated; check Public read permissions." unless record[field].is_a?(Array)
    end
    # Export only website fields, keeping API/private provider metadata out of Git.
    {
      "id" => record["documentId"],
      "name" => record["name"],
      "description" => record["description"],
      "create_date" => record["create_date"],
      "type" => selected["key"],
      "url" => record["url"],
      "visibility" => record["visibility"],
      "modal_type" => record["modal_type"],
      "main_image" => image(record["main_image"]),
      "gallery" => record["gallery"].map { |entry| image(entry) },
      "technologies" => record["technologies"].map { |entry| entry.slice("name", "color") },
      "collaborators" => record["collaborators"].map { |entry| entry.slice("name", "position", "website", "to_show") },
    }
  end

  def self.valid_snapshot?(data)
    return false unless data.is_a?(Hash) && data["version"] == 2 &&
                        data["categories"].is_a?(Array) && !data["categories"].empty? &&
                        data["projects"].is_a?(Array)

    keys = data["categories"].map { |entry| entry.is_a?(Hash) && entry["key"] }
    return false unless keys.all? { |key| key.is_a?(String) && !key.empty? } && keys.uniq.size == keys.size
    return false unless data["categories"].all? do |entry|
      entry["name"].is_a?(String) && !entry["name"].strip.empty? &&
        entry["slug"].is_a?(String) && entry["display_order"].is_a?(Integer)
    end
    ids = data["projects"].map { |entry| entry.is_a?(Hash) && entry["id"] }
    return false unless ids.all? { |id| id.is_a?(String) && !id.empty? } && ids.uniq.size == ids.size

    data["projects"].all? do |entry|
      entry["name"].is_a?(String) && keys.include?(entry["type"]) && entry.dig("main_image", "url").is_a?(String) &&
        %w(gallery technologies collaborators).all? { |field| entry[field].is_a?(Array) }
    end
  rescue TypeError, NoMethodError
    false
  end

  def self.read_snapshot(site)
    # Never replace missing/corrupt saved data with an empty portfolio.
    data = begin
      JSON.parse(File.read(File.join(site.source, SNAPSHOT_FILE)))
    rescue JSON::ParserError, SystemCallError
      nil
    end
    unless valid_snapshot?(data)
      raise Jekyll::Errors::FatalException, "Missing or invalid #{SNAPSHOT_FILE}. Start Strapi v5, run bundle exec jekyll serve to save the projects, and include that file in your GitHub commit."
    end
    data
  end

  def self.write_snapshot(site, data)
    path = File.join(site.source, SNAPSHOT_FILE)
    contents = JSON.pretty_generate(data) + "\n"
    # Avoid touching an unchanged file and triggering another watch rebuild.
    return if File.file?(path) && File.binread(path) == contents.b

    FileUtils.mkdir_p(File.dirname(path))
    # Replace the saved file only after the complete new export has been written.
    temporary = "#{path}.#{Process.pid}.tmp"
    begin
      File.write(temporary, contents)
      File.rename(temporary, path)
    ensure
      File.delete(temporary) if File.exist?(temporary)
    end
  end

  def self.fetch_snapshot(site)
    categories = fetch_collection(site, "categories", "sort" => ["display_order:asc", "id:asc"]).map { |entry| category(entry) }
    raise "Strapi must contain at least one portfolio category with a unique key." if categories.empty? || categories.map { |entry| entry["key"] }.uniq.size != categories.size

    # Include everything used by cards, info modals, gallery images and filters.
    rows = fetch_collection(site, "projects", "sort" => ["createdAt:asc", "id:asc"],
                            "populate" => %w(main_image gallery technologies collaborators category).to_h { |field| [field, true] })
    data = { "version" => 2, "categories" => categories, "projects" => rows.map { |entry| project(entry, categories) } }
    raise "Strapi returned invalid portfolio data; saved projects were not changed." unless valid_snapshot?(data)

    data
  end

  def self.snapshot(site)
    # Share one result across templates and local watch rebuilds in this session.
    return site.instance_variable_get(:@portfolio_v5_snapshot) if site.instance_variable_defined?(:@portfolio_v5_snapshot)

    data = nil
    # Only local preview startup contacts Strapi and updates the file for Git.
    if local_preview?(site)
      begin
        data = fetch_snapshot(site)
      rescue StandardError => error
        Jekyll.logger.warn "Strapi v5:", "#{error.message} Using saved projects; CMS edits were not refreshed."
      end
      if data
        # Save only a complete, validated read. Persistence errors stop the build
        # so an update is never shown locally without a durable copy to publish.
        write_snapshot(site, data)
        Jekyll.logger.info "Strapi v5:", "Saved #{data['projects'].size} projects to #{SNAPSHOT_FILE}. Include this file when committing project updates."
      end
    end
    # Netlify/normal builds always take this path, with no CMS request.
    unless data
      data = read_snapshot(site)
      Jekyll.logger.info "Strapi v5:", "Using #{SNAPSHOT_FILE}; no CMS connection is needed for this build."
    end
    site.instance_variable_set(:@portfolio_v5_snapshot, data)
  end
end

module Jekyll
  module Strapi
    class StrapiCollection
      def each
        return enum_for(:each) unless block_given?
        raise "The portfolio v5 adapter only supports projects and categories." unless PortfolioV5::COLLECTIONS.include?(@collection_name)

        PortfolioV5.snapshot(@site).fetch(@collection_name).each do |record|
          yield JSON.parse(JSON.generate(record), :object_class => OpenStruct)
        end
      end
    end
  end
end

# Load before Liquid rendering so missing/invalid saved data fails the build.
# Local previews refresh the durable snapshot; all templates share its records.
Jekyll::Hooks.register :site, :pre_render do |site|
  PortfolioV5.snapshot(site)
end

# Normal builds read the committed snapshot. A local serve session refreshes it
# once at startup and reuses its in-memory content during watch rebuilds.
Jekyll::Hooks.register :site, :after_reset do |site|
  if !PortfolioV5.local_preview?(site) && site.instance_variable_defined?(:@portfolio_v5_snapshot)
    site.remove_instance_variable(:@portfolio_v5_snapshot)
  end
end
