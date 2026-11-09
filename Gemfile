source "https://rubygems.org"

gem "jekyll", "~> 4.4.1"
# jekyll-strapi still requires JSON 2.x; use its patched release.
gem "json", ">= 2.21.2", "< 3"

group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.18.0"
  gem 'jekyll-strapi', '~> 0.1.3'
  gem 'jekyll-paginate-v2', '~> 3.0'
end

# Windows and JRuby does not include zoneinfo files, so bundle the tzinfo-data gem
# and associated library.
platforms :windows, :jruby do
  gem "tzinfo", "~> 2.0"
  gem "tzinfo-data"
end

# Performance-booster for watching directories on Windows
gem "wdm", "~> 0.2.0", platforms: :windows

gem "webrick", "~> 1.9"
