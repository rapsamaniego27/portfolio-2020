# frozen_string_literal: true

# Real Jekyll/Strapi Liquid checks using disposable sites and a read-only v5 API
# fixture. No request here writes to Neon or Cloudinary.
require "fileutils"
require "json"
require "open3"
require "rbconfig"
require "socket"
require "tmpdir"
require "uri"
require "yaml"

$stdout.sync = true
ROOT = File.expand_path("../..", __dir__)
SNAPSHOT_FILE = "_data/strapi_projects.json"
RUNNER = <<~'RUBY'
  source, mode, repetitions = ARGV
  site = Jekyll::Site.new(Jekyll.configuration(
    "source" => source, "destination" => File.join(source, "_site"),
    "config" => File.join(source, "_config.yml"), "serving" => mode == "serve"
  ))
  Integer(repetitions).times { site.process }
RUBY

def assert(value, message)
  raise message unless value
end

def site_fixture(endpoint)
  Dir.mktmpdir("portfolio-liquid-projects-") do |directory|
    assert(File.expand_path(directory).start_with?(File.expand_path(Dir.tmpdir) + File::SEPARATOR), "Unexpected temporary path")
    FileUtils.mkdir_p(File.join(directory, "_plugins"))
    FileUtils.cp(File.join(ROOT, "_plugins/strapi_v5.rb"), File.join(directory, "_plugins/strapi_v5.rb"))
    FileUtils.cp(File.join(ROOT, "projects.json"), File.join(directory, "projects.json"))
    config = {
      "title" => "Portfolio fixture", "exclude" => [".cache"], "plugins" => ["jekyll-strapi"],
      "strapi" => { "endpoint" => endpoint, "collections" => { "projects" => { "type" => "projects" }, "categories" => { "type" => "categories" } } },
    }
    File.write(File.join(directory, "_config.yml"), YAML.dump(config))
    File.write(File.join(directory, "index.html"), "---\n---\n{% for category in strapi.collections.categories %}<a data-project-type=\"{{ category.key | escape }}\">{{ category.name | escape }}</a>{% endfor %}\n")
    yield directory
  end
end

def api_fixture
  server = TCPServer.new("127.0.0.1", 0)
  endpoint = "http://127.0.0.1:#{server.addr[1]}/api"
  state = { :label => 'Web "Work" & More', :requests => [], :status => 200, :empty => false, :duplicate => false, :temporary_failures => 0, :builds => 0 }
  worker = Thread.new do
    loop do
      client = server.accept
      begin
        line = client.gets
        while (header = client.gets) && header != "\r\n"; end
        next unless line

        uri = URI.parse("http://fixture" + line.split[1])
        state[:requests] << uri
        status = state[:status]
        if state[:temporary_failures] > 0
          status = 503
          state[:temporary_failures] -= 1
        end
        if uri.path == "/api/categories"
          state[:builds] += 1 if status == 200
          records = [
            { "documentId" => "web-category", "key" => "Web", "name" => state[:label], "slug" => "web", "display_order" => 0 },
            { "documentId" => "case-category", "key" => nil, "name" => "Case Studies", "slug" => "case-studies", "display_order" => 1 },
            { "documentId" => "empty-category", "key" => "empty", "name" => "Empty", "slug" => "empty", "display_order" => 2 },
          ]
          total, pages = 3, 1
        else
          page = URI.decode_www_form(uri.query).to_h.fetch("pagination[page]").to_i
          id = state[:duplicate] ? 1 : page
          records = state[:empty] ? [] : [{
            "documentId" => "project-#{id}", "name" => "Build #{state[:builds]} project #{page}",
            "description" => "Quoted \"description\"\nBackslash \\ and café", "create_date" => "2024-01-01",
            "type" => "Web", "category" => { "documentId" => page == 1 ? "web-category" : "case-category" },
            "url" => "https://project.example.com/#{page}", "visibility" => true, "modal_type" => "info", "legacyId" => "PRIVATE-LEGACY",
            "main_image" => { "url" => "https://example.com/main.png", "provider_metadata" => { "secret" => "PRIVATE-METADATA" } },
            "gallery" => page == 1 ? [{ "url" => "https://example.com/gallery.png" }] : [],
            "technologies" => [{ "name" => 'Ruby "JSON"', "color" => "#6750A4", "users" => ["PRIVATE-USER"] }],
            "collaborators" => page == 1 ? [{ "name" => 'Jo "Designer"', "position" => "Design", "website" => nil, "to_show" => true }] : [],
          }]
          total, pages = state[:empty] ? [0, 0] : [2, 2]
        end
        body = JSON.generate("data" => records, "meta" => { "pagination" => { "total" => total, "pageCount" => pages } })
        client.write("HTTP/1.1 #{status} Test\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: #{body.bytesize}\r\nConnection: close\r\n\r\n#{body}")
      ensure
        client.close
      end
    end
  rescue IOError, Errno::EBADF
    # Closing this fixture listener ends its accept loop.
  end
  yield endpoint, state
ensure
  server&.close
  worker&.join
end

def build(directory, mode: "build", repetitions: 1, netlify: nil, override: nil)
  Open3.capture3(
    { "JEKYLL_ENV" => mode == "serve" ? "development" : "production", "NETLIFY" => netlify, "STRAPI_API_URL" => override, "NODE_BINARY" => "node-must-not-be-needed-for-liquid" },
    RbConfig.ruby, "-rjekyll", "-e", RUNNER, directory, mode, repetitions.to_s, :chdir => ROOT
  )
end

def output(directory)
  JSON.parse(File.read(File.join(directory, "_site/projects.json")))
end

checks = 0
api_fixture do |endpoint, state|
  site_fixture(endpoint) do |directory|
    template = File.binread(File.join(directory, "projects.json"))
    stdout, stderr, status = build(directory, :mode => "serve", :repetitions => 2)
    assert(status.success?, "Serve failed: #{stdout}\n#{stderr}")
    result = output(directory)
    assert(state[:requests].size == 3, "Templates/watch rebuilds fetched duplicate API records")
    assert(result["projects"].size == 2 && result["categories"].size == 3, "Pagination or empty categories were lost")
    assert(result["projects"].map { |row| row["type"] } == ["Web", "case-studies"], "Relation keys or legacy filter names changed")
    assert(result["projects"].first["url"] == "https://project.example.com/1", "Strapi gem replaced the domain URL with a permalink")
    assert(result["projects"].first["description"] == "Quoted \"description\"\nBackslash \\ and café", "Liquid JSON escaping changed content")
    assert(result["projects"].first["technologies"].first["color"] == "#6750A4", "Technology color was lost")
    assert(result["projects"].first["collaborators"].first["name"] == 'Jo "Designer"', "Collaborator fields were lost")
    assert(result["projects"].last["gallery"] == [] && result["projects"].last["collaborators"] == [], "Empty relations are not JSON arrays")
    assert(!JSON.generate(result).include?("PRIVATE-"), "Private metadata was serialized")
    markup = File.read(File.join(directory, "_site/index.html"))
    assert(markup.include?("&quot;Work&quot; &amp; More") && markup.include?("Case Studies") && markup.include?("Empty"), "Category labels were not safely rendered from Strapi")
    assert(File.binread(File.join(directory, "projects.json")) == template, "Generated data overwrote the Liquid source template")
    assert(!File.exist?(File.join(directory, "_site/.cache")), "Local cache was published")
    checks += 1; puts "PASS: Liquid generates valid public JSON with pagination, populated modals and unchanged source template"

    saved_path = File.join(directory, SNAPSHOT_FILE)
    saved = File.binread(saved_path)
    assert(JSON.parse(saved) == result, "The complete public export was not saved for GitHub")
    assert(!JSON.generate(JSON.parse(saved)).include?("PRIVATE-"), "Private API metadata entered the committed snapshot")
    checks += 1; puts "PASS: local serve saves the complete public export in the repository"

    # A production build must not probe or wake a CMS that is disabled for months.
    state[:status] = 403
    requests = state[:requests].size
    stdout, stderr, status = build(directory, :repetitions => 2)
    assert(status.success?, "Offline production builds failed: #{stdout}\n#{stderr}")
    assert(state[:requests].size == requests, "Production contacted the disabled CMS")
    assert(output(directory) == result && File.binread(saved_path) == saved, "Offline build lost or changed saved projects")
    checks += 1; puts "PASS: repeated production builds work with Strapi disabled and make zero API requests"

    # Simulate a new Netlify checkout: no _site, ignored cache, or previous deploy.
    site_fixture(endpoint) do |clean|
      FileUtils.mkdir_p(File.join(clean, "_data"))
      File.binwrite(File.join(clean, SNAPSHOT_FILE), saved)
      File.write(File.join(clean, "index.html"), "---\n---\nNew GitHub CMS content\n{% for category in strapi.collections.categories %}{{ category.name }}{% endfor %}")
      [nil, endpoint, "https://disabled-cms.example/api"].each do |override|
        stdout, stderr, status = build(clean, :netlify => "true", :override => override)
        assert(status.success?, "Clean Netlify build failed: #{stdout}\n#{stderr}")
        assert(state[:requests].size == requests, "Netlify tried to contact the API")
        assert(output(clean) == result, "Clean Netlify build did not retain saved portfolio data")
        assert(File.read(File.join(clean, "_site/index.html")).include?("New GitHub CMS content"), "GitHub CMS edits could not be rebuilt offline")
        assert(!File.exist?(File.join(clean, "_site/_data")), "Raw snapshot directory was published")
      end
      checks += 1; puts "PASS: clean Netlify builds publish GitHub CMS edits offline without an API URL or build cache"
    end

    stdout, stderr, status = build(directory, :mode => "serve")
    assert(status.success? && (stdout + stderr).include?("Using saved projects; CMS edits were not refreshed"), "Offline local preview did not explain that it uses saved data")
    assert(state[:requests].size == requests + 1, "A local permission failure was retried")
    assert(output(directory) == result && File.binread(saved_path) == saved, "Failed refresh overwrote saved projects")
    checks += 1; puts "PASS: offline local serve preserves saved projects and clearly reports that no refresh occurred"

    state[:status] = 200
    state[:label] = "Updated after six months"
    stdout, stderr, status = build(directory, :mode => "serve")
    assert(status.success?, "Refresh after re-enabling Strapi failed: #{stdout}\n#{stderr}")
    updated = output(directory)
    assert(updated["categories"].first["name"] == state[:label], "Re-enabled CMS did not refresh categories")
    assert(updated["projects"].first["name"] == "Build 2 project 1", "Re-enabled CMS did not refresh project details")
    assert(JSON.parse(File.read(saved_path)) == updated, "Refreshed data was not durably saved for the next deployment")
    assert(File.binread(File.join(directory, "projects.json")) == template, "Refresh overwrote the Liquid template")
    checks += 1; puts "PASS: restarting local serve with Strapi online refreshes the durable snapshot automatically"

    state[:duplicate] = true
    saved = File.binread(saved_path)
    stdout, stderr, status = build(directory, :mode => "serve")
    assert(status.success? && (stdout + stderr).include?("duplicate documentId"), "Incomplete API data was not rejected with a warning")
    assert(File.binread(saved_path) == saved && output(directory) == updated, "Incomplete API data replaced the last complete export")
    assert(Dir.glob(File.join(directory, "_data/*.tmp")).empty?, "A partial export was left behind")
    checks += 1; puts "PASS: incomplete API reads cannot overwrite or partially publish the saved export"
  end
end

api_fixture do |endpoint, state|
  state[:empty] = true
  site_fixture(endpoint) do |directory|
    stdout, stderr, status = build(directory, :mode => "serve")
    assert(status.success? && output(directory)["projects"] == [], "Empty project collection is not valid JSON: #{stdout}\n#{stderr}")
    requests = state[:requests].size
    stdout, stderr, status = build(directory, :netlify => "true")
    assert(status.success? && output(directory)["projects"] == [] && state[:requests].size == requests, "Saved empty collection could not build offline")
    checks += 1; puts "PASS: an empty project collection renders a valid empty JSON array"
  end
end

api_fixture do |endpoint, state|
  state[:duplicate] = true
  site_fixture(endpoint) do |directory|
    stdout, stderr, status = build(directory, :mode => "serve")
    assert(!status.success? && (stdout + stderr).include?("duplicate documentId"), "Duplicate API pages were silently published")
    assert(!File.exist?(File.join(directory, SNAPSHOT_FILE)), "Incomplete export created a snapshot")
    checks += 1; puts "PASS: duplicate project pages fail before JSON publication"
  end
end

api_fixture do |endpoint, state|
  site_fixture(endpoint) do |directory|
    stdout, stderr, status = build(directory, :netlify => "true")
    assert(!status.success? && (stdout + stderr).include?("Missing or invalid #{SNAPSHOT_FILE}"), "Missing saved data did not fail with refresh/commit instructions")
    assert(state[:requests].empty?, "Production contacted the API to replace missing saved data")
    checks += 1; puts "PASS: missing committed data stops production with clear refresh instructions"
  end
end

api_fixture do |endpoint, state|
  site_fixture(endpoint) do |directory|
    FileUtils.mkdir_p(File.join(directory, "_data"))
    File.write(File.join(directory, SNAPSHOT_FILE), JSON.generate("version" => 2, "categories" => [], "projects" => []))
    stdout, stderr, status = build(directory, :netlify => "true")
    assert(!status.success? && (stdout + stderr).include?("Missing or invalid #{SNAPSHOT_FILE}"), "Invalid saved data was accepted")
    assert(state[:requests].empty?, "Invalid saved data caused an API fetch in production")
    checks += 1; puts "PASS: invalid saved data fails instead of silently publishing an empty portfolio"
  end
end

puts "All #{checks} Jekyll/Liquid integration checks passed."
