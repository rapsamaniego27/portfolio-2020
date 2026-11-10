# Development

[Back to the README](../README.md)

## Install from a fresh clone

Install Git, Node.js 24.22.2, Ruby 3.4.12, and Bundler 4.0.16. On Windows,
use RubyInstaller with Devkit. The version files describe the required runtimes;
they do not install or switch runtimes by themselves.

Some CMS filenames are long. On Windows, enable long-path support while cloning
and retain it in the repository configuration:

```powershell
git -c core.longpaths=true clone https://github.com/rapsamaniego27/portfolio-2020.git portfolio
cd portfolio
git config core.longpaths true
node --version
npm --version
ruby --version
gem install bundler -v 4.0.16
npm ci
bundle install
```

For the existing Windows checkout, run commands from
`D:\dev-stuff\projects\portfolio`. With nvm-windows installed, select Node using
`nvm install 24.22.2` and `nvm use 24.22.2`. Select Ruby separately.

Use npm here. The separate Strapi v5 project uses its own Node version and
`yarn dev:neon` workflow; do not switch the portfolio to Yarn or share dependencies.

## Run locally

Compile once, then start Jekyll:

```powershell
npm run dev
bundle exec jekyll serve
```

Open `http://127.0.0.1:4000/`. Use a second terminal for `npm run watch` while
editing Sass or JavaScript. Jekyll serves the generated assets from `dist`.

If port 4000 is occupied, stop your own existing preview or choose another port:

```powershell
bundle exec jekyll serve --port 4001
```

Strapi is not required for ordinary development. Local Jekyll startup tries to
refresh its export once, then uses the saved file with a warning if the CMS is
unavailable. Restart Jekyll after CMS edits to refresh projects again. Changes to
`_config.yml` also require a restart.

## Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the exact JavaScript dependencies from the lockfile. |
| `bundle install` | Install the Ruby dependencies from the lockfile. |
| `npm run dev` | Compile development assets once. |
| `npm run watch` | Recompile assets when source files change. |
| `npm run watch-poll` | Watch using polling if native file watching does not work. |
| `npm run prod` | Compile and minify production assets. |
| `npm run check` | Run the production asset build and npm advisory audit. |
| `bundle exec jekyll serve` | Refresh projects when available, then serve/watch locally. |
| `bundle exec jekyll build` | Build `_site` from the saved projects without API requests. |
| `npm run test:projects` | Check JSON loading, filters, shared downloads, and modal data. |
| `npm run test:contact` | Check local preview notices and native submission on deployed hosts. |
| `npm run test:jekyll` | Check real Liquid builds, offline deployment, exports, pagination, and failure handling. |

`npm run test:local-api` is an alias for `test:projects`; `npm run hot` is an alias
for `watch`. No separate Webpack development server is required.

## Source and generated files

| Source | Output or responsibility |
| --- | --- |
| `source/scss/style.scss` and its partials | `dist/style.min.css` |
| `source/js/classes`, `components`, `misc`, then `vendors/app.js` | `dist/app.js` |
| `source/js/search` | `dist/search.js` |
| Installed GSAP and Font Awesome assets | `dist/vendor` |
| `_plugins/strapi_v5.rb` | Refresh/save project exports locally and load saved data for builds. |
| `projects.json` | Liquid template generating `_site/projects.json`. |
| `source/js/classes/StaticProjects.js` | Download the browser JSON once and filter/look up projects. |
| `Portfolio.js` and `Animate.js` | Render cards and replay category entrance animations. |
| `Modal.js` | Project details, image zoom/panning, focus, and keyboard controls. |
| `_includes/contact-form.html` and `Contact.js` | Netlify form markup and local preview notice. |

`webpack.mix.js` retains its original filename but configures Webpack directly.
JavaScript uses shared classic script scope. Files within each JavaScript folder
are combined in filename order, so classes are available before component startup.
Keep edits in `source`; regenerate `dist` instead of editing compiled files.

## Reusing the Sass boilerplate

Add modules inside the existing Sass folders and load them from `style.scss`:

```scss
@use '4-layout/your-file' as *;
```

Load shared variables/functions/mixins explicitly in partials that need them:

```scss
@use '../1-vendor/variables' as *;
@use '../2-base/functions' as *;
@use '../2-base/mixins' as *;
```

Existing variable and helper names are preserved. Theme defaults use `!default`,
so configure them on the first module load when reusing the boilerplate. Use
modern Sass modules and `math.div()`; the build rejects reintroduced legacy Sass
imports, global built-ins, color functions, and slash division. The Google Fonts
CSS import remains separate.

## Manual verification

- Select portfolio categories, including switching quickly; check counts/cards.
- Open an info modal, click its main/gallery images, and try zoom, Fit, and panning.
- Close the viewer and confirm the info modal retains its position; test Escape.
- Check phone layout and the device's reduced-motion setting.
- On localhost, confirm blank/invalid contact fields are blocked and valid input
  opens the message-not-sent notice without clearing the message.

Local form tests do not verify hosted CAPTCHA checks, inbox delivery, or Decap
OAuth. Those require the deployed services. The Jekyll integration tests use
disposable local API fixtures and do not write to Neon or Cloudinary.

## Troubleshooting

- **Changes in Sass/JavaScript do not appear:** run `npm run watch`, check its
  output, then reload the browser. Jekyll does not compile these source files.
- **File watching misses changes:** try `npm run watch-poll`.
- **Saved projects warning:** ordinary previews still work. For fresh CMS changes,
  start Strapi and restart Jekyll; confirm the `Saved ... projects` log.
- **Missing/invalid export:** restore `_data/strapi_projects.json` from Git or
  refresh it from Strapi. Do not replace it with an empty placeholder.
- **Runtime/install errors:** check `node --version`, `npm --version`,
  `ruby --version`, and `bundle --version` against the README before reinstalling.
- **Dependency maintenance:** use `npm outdated`, `npm audit`, and a current
  Ruby advisory audit when updating packages. Keep both lockfiles reviewed.
