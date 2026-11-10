# frozen_string_literal: true

# Exercise real HTTP serialization against a disposable GitHub Contents fixture.
# No token, live repository, Neon row or Cloudinary asset is changed here.
require "tmpdir"
require "socket"
require "fileutils"
require_relative "../scripts/netlify-projects"

def assert(value, message)
  raise message unless value
end

def assert_raises(message)
  begin
    yield
  rescue StandardError => error
    assert(error.message.include?(message), "Unexpected error: #{error.message}")
    return
  end
  raise "Expected failure: #{message}"
end

def github_fixture(saved)
  listener = TCPServer.new("127.0.0.1", 0)
  state = { :contents => saved, :sha => "original-sha", :gets => 0, :puts => [], :reject => false, :conflicts => 0 }
  worker = Thread.new do
    loop do
      socket = listener.accept
      begin
        line = socket.gets
        next unless line

        method, request_path = line.split
        headers = {}
        while (header = socket.gets) && header != "\r\n"
          key, value = header.split(":", 2)
          headers[key.downcase] = value.strip
        end
        raw = socket.read(headers.fetch("content-length", "0").to_i)
        expected_path = "/repos/rapsamaniego27/portfolio-2020/contents/_data/strapi_projects.json"
        assert(URI(request_path).path == expected_path, "Publisher targeted an unexpected repository/file")
        assert(headers["authorization"] == "Bearer fixture-token", "GitHub authentication was not sent correctly")
        if method == "GET"
          state[:gets] += 1
          assert(URI.decode_www_form(URI(request_path).query).to_h["ref"] == "master", "Wrong source branch")
          status = 200
          body = { "type" => "file", "sha" => state[:sha], "encoding" => "base64", "content" => Base64.encode64(state[:contents]) }
        else
          assert(method == "PUT", "Unexpected HTTP method")
          payload = JSON.parse(raw)
          state[:puts] << payload
          assert(payload["branch"] == "master" && payload["sha"] == state[:sha], "GitHub save did not protect the current version")
          assert(payload["message"].include?("[skip netlify]"), "Snapshot commit can cause a deploy loop")
          if state[:reject]
            status, body = 403, { "message" => "Not permitted" }
          elsif state[:conflicts] > 0
            state[:conflicts] -= 1
            state[:sha] = "concurrent-sha"
            status, body = 409, { "message" => "Version conflict" }
          else
            state[:contents] = Base64.strict_decode64(payload["content"])
            state[:sha] = "saved-sha"
            status, body = 200, { "commit" => { "sha" => state[:sha] } }
          end
        end
        encoded = JSON.generate(body)
        socket.write("HTTP/1.1 #{status} Test\r\nContent-Type: application/json\r\nContent-Length: #{encoded.bytesize}\r\nConnection: close\r\n\r\n#{encoded}")
      ensure
        socket.close
      end
    end
  rescue IOError, Errno::EBADF
    # Closing the listener stops its worker.
  end
  publisher = PortfolioProjectSync::GitHubSnapshot.new("fixture-token", :api_base => "http://127.0.0.1:#{listener.addr[1]}")
  yield publisher, state
ensure
  listener&.close
  worker&.join
end

root = File.expand_path("../..", __dir__)
original = JSON.parse(File.read(File.join(root, PortfolioV5::SNAPSHOT_FILE)))
updated = Marshal.load(Marshal.dump(original))
updated["projects"].first["name"] = "Updated webhook project — café"
env = {
  "NETLIFY" => "true", "CONTEXT" => "production", "BRANCH" => "master",
  "INCOMING_HOOK_URL" => "https://api.netlify.com/build_hooks/fixture",
  "PORTFOLIO_SNAPSHOT_TOKEN" => "fixture-token",
  "INCOMING_HOOK_BODY" => URI.encode_www_form_component(JSON.generate("event" => "entry.update", "model" => "project")),
}
checks = 0

Dir.mktmpdir("portfolio-webhook-test-") do |directory|
  FileUtils.mkdir_p(File.join(directory, "_data"))
  saved_path = File.join(directory, PortfolioV5::SNAPSHOT_FILE)
  contents = JSON.pretty_generate(original) + "\n"
  File.write(saved_path, contents)
  site = Struct.new(:source).new(directory)
  forbidden = ->(_) { raise "This build must not contact Strapi" }

  [{}, env.merge("INCOMING_HOOK_URL" => ""), env.merge("CONTEXT" => "deploy-preview"),
   env.merge("BRANCH" => "preview"), env.merge("INCOMING_HOOK_BODY" => '{"model":"post"}')].each do |ordinary|
    assert(PortfolioProjectSync.run(site, :env => ordinary, :fetcher => forbidden) == :offline, "Ordinary build tried refreshing")
  end
  assert(File.read(saved_path) == contents, "Offline builds changed the export")
  checks += 1; puts "PASS: normal Git/Decap, preview, branch and unrelated CMS builds never fetch the API"

  assert_raises("PORTFOLIO_SNAPSHOT_TOKEN") { PortfolioProjectSync.run(site, :env => env.merge("PORTFOLIO_SNAPSHOT_TOKEN" => ""), :fetcher => forbidden) }
  assert_raises("valid JSON") { PortfolioProjectSync.run(site, :env => env.merge("INCOMING_HOOK_BODY" => "%invalid"), :fetcher => forbidden) }
  assert_raises("JSON object") { PortfolioProjectSync.run(site, :env => env.merge("INCOMING_HOOK_BODY" => "[]"), :fetcher => forbidden) }
  checks += 1; puts "PASS: missing credentials and malformed hooks stop without contacting the CMS or changing saved data"

  github_fixture(contents) do |publisher, state|
    result = PortfolioProjectSync.run(site, :env => env, :publisher => publisher, :fetcher => ->(_) { updated })
    assert(result == :saved && state[:puts].size == 1, "Webhook did not save exactly once")
    assert(JSON.parse(state[:contents]) == updated && JSON.parse(File.read(saved_path)) == updated, "Published/GitHub data differs")
    checks += 1; puts "PASS: webhook refresh commits the complete JSON over HTTP before updating the build's copy"

    result = PortfolioProjectSync.run(site, :env => env.merge("INCOMING_HOOK_BODY" => "{}"), :publisher => publisher, :fetcher => ->(_) { updated })
    assert(result == :unchanged && state[:puts].size == 1, "An unchanged export created a duplicate commit")
    checks += 1; puts "PASS: repeat/manual hook with identical data creates no duplicate commit"
  end

  File.write(saved_path, contents)
  github_fixture(contents) do |publisher, state|
    state[:reject] = true
    assert_raises("HTTP 403") { PortfolioProjectSync.run(site, :env => env, :publisher => publisher, :fetcher => ->(_) { updated }) }
    assert(File.read(saved_path) == contents && state[:contents] == contents, "Rejected persistence changed the export")
    checks += 1; puts "PASS: GitHub permission failure leaves both saved copies intact and fails the build"
  end

  github_fixture(contents) do |publisher, state|
    fetches = 0
    state[:conflicts] = 1
    fetcher = ->(_) { fetches += 1; Marshal.load(Marshal.dump(updated)).tap { |data| data["projects"].first["name"] = "Refresh #{fetches}" } }
    result = PortfolioProjectSync.run(site, :env => env, :publisher => publisher, :fetcher => fetcher)
    assert(result == :saved && fetches == 2 && state[:gets] == 2 && state[:puts].size == 2, "Conflict was not safely retried")
    assert(JSON.parse(state[:contents])["projects"].first["name"] == "Refresh 2", "Conflict retry reused stale data")
    checks += 1; puts "PASS: concurrent GitHub saves refetch CMS data and use the latest file SHA"
  end

  File.write(saved_path, contents)
  github_fixture(contents) do |publisher, state|
    state[:conflicts] = 3
    assert_raises("changed repeatedly") { PortfolioProjectSync.run(site, :env => env, :publisher => publisher, :fetcher => ->(_) { updated }) }
    assert(File.read(saved_path) == contents && state[:contents] == contents, "Exhausted conflicts published stale data")
    assert_raises("invalid") { PortfolioProjectSync.run(site, :env => env, :publisher => publisher, :fetcher => ->(_) { { "projects" => [] } }) }
    checks += 1; puts "PASS: exhausted conflicts and invalid exports cannot replace the saved data"
  end

  github_fixture(contents) do |publisher, state|
    assert_raises("CMS offline") { PortfolioProjectSync.run(site, :env => env, :publisher => publisher, :fetcher => ->(_) { raise "CMS offline" }) }
    assert(state[:gets] == 0 && state[:puts].empty? && File.read(saved_path) == contents, "Failed CMS fetch reached GitHub or overwrote data")
    checks += 1; puts "PASS: CMS outage preserves the durable export and existing live website"
  end
end

puts "All #{checks} webhook persistence checks passed."
