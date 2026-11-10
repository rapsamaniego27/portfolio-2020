# Upgrade notes — November 2026

These notes record the previous dependency upgrade and its verification results.
For current setup and publishing instructions, start with the [main README](../README.md).
Advisory results are dated observations; rerun audits when maintaining dependencies.

## Dependency upgrade — November 2026

- Jekyll **4.1.1 → 4.4.1**, Jekyll Feed **0.13.0 → 0.18.0**, and refreshed Ruby
  dependencies. JSON stays on **2.21.2**, required by `jekyll-strapi`'s 2.x constraint.
- Direct Webpack **5.112.2** with Webpack CLI **7.3.1**, PostCSS **8.5.32**, Dart
  Sass **1.108.1**, Autoprefixer **10.6.2**, CSSnano **9.9.0**, and Terser **5.51.2**.
  Laravel Mix, its development server, the old loaders, and compatibility overrides
  have been removed.
- GSAP/ScrollTrigger **3.5.1 → 3.15.1** and Font Awesome **5.15.1 → 7.3.1**.
  npm locks these versions and Webpack copies the browser assets to `dist/vendor`.
  Font Awesome includes aliases for the existing icon names, with a small Sass
  compatibility rule to preserve their previous natural widths.
- Netlify CMS's script is replaced by the pinned Decap CMS **3.17.3** script.
  The existing GitHub repository/backend configuration is retained.
- Unused direct packages were removed: Axios, Cross Env, Lodash, the Vue template
  compiler, Bootstrap, jQuery, and Popper. The unused jQuery source copy is no
  longer included in the shipped JavaScript.
- The unused Minima theme gem was removed; this site uses its own layouts.

Both lockfiles belong in Git. The Ruby lockfile includes Windows and Linux
platforms. Use `npm ci` and `bundle install` after pulling dependency changes to
install the locked versions.

### Existing folders and build behavior

`webpack.mix.js` keeps its filename but exports a normal Webpack configuration.
A small asset plugin uses Webpack's compilation and watch APIs to preserve this
site's existing pipeline:

| Input | Output |
| --- | --- |
| `source/scss/style.scss` and its partials | `dist/style.min.css` |
| `source/js/classes`, `components`, `misc`, then `vendors/app.js` | `dist/app.js` |
| `source/js/search` | `dist/search.js` |
| Installed GSAP and Font Awesome assets | `dist/vendor` |

JavaScript files within each folder are read in filename order. The output stays
in classic browser script scope, preserving shared class names and the variables
used by the diary's inline search handler. Existing JavaScript paths and classic
script scope are retained. CSS URLs remain untouched, and production builds minify CSS and JS.
Build errors preserve the last successful output; watch mode resumes after source
errors are fixed. Native watching and polling both detect JS additions/deletions
and Sass changes.

Sass now uses `@use`, modern built-in modules, and `math.div()` in the existing
files. Local modules use `as *` to preserve the existing variable and helper names.
The Google Fonts URL remains a regular CSS import. The build rejects reintroduced
legacy Sass imports, global built-ins, color functions, and slash division.

Theme, font, breakpoint, grid, and spacing defaults are configurable with
`!default`; their existing names and default values are retained. `fontWeight()`
now reads the correct font-weight group and argument.
`jekyll-strapi` 0.1.3 remains pinned for Liquid's collection interface. The browser
uses the generated JSON described above rather than a runtime Strapi request.

### Extending the Sass boilerplate

Keep using the existing folders and add a module to `source/scss/style.scss` with
`@use '4-layout/your-file' as *;`. In a partial, explicitly load only the shared
members it needs, for example:

```scss
@use '../1-vendor/variables' as *;
@use '../2-base/functions' as *;
@use '../2-base/mixins' as *;
```

Existing calls such as `$sans-serif`, `color('primary')`, `fontWeight('weight-bold')`,
and `@include btn-background(...)` retain their names. Built-in Sass operations use
their standard namespaces, such as `map.get()`, `color.adjust()`, and `math.div()`.

To configure a module for another project, change its existing defaults or add
`with (...)` to its first `@use`. For example, the existing variables import can be:

```scss
@use '1-vendor/variables' as * with (
  $sans-serif: (Arial, sans-serif)
);
```

Configuration must happen before another module loads that module. After changes,
run `npm run check` and inspect the pages. Run `npm outdated` when reviewing
available dependency updates; it reports updates without installing them.

The build uses [Webpack compilation hooks](https://webpack.js.org/api/compilation-hooks/#processassets)
and the [modern Sass API](https://sass-lang.com/documentation/js-api/functions/compileasync/).
Other upgrade references include
[Jekyll release notes](https://jekyllrb.com/news/releases/), and
[Font Awesome upgrade guide](https://docs.fontawesome.com/upgrade/upgrade-from-older-versions/).

### Advisory status

On November 9, 2026, the direct Webpack dependency tree reported **zero advisories**
in both `npm audit` and `npm audit --omit=dev`. Removing Mix eliminated its 12
reported affected packages, including the development server and middleware.
Recheck these commands when updating dependencies; a clean audit describes the
currently reported advisories rather than a guarantee against future findings.
The refreshed Ruby advisory database reported no vulnerabilities in `Gemfile.lock`.
`npm audit --omit=dev` reported zero advisories for the shipped npm dependencies.

### Verification

Passed: clean `npm ci`, development and production asset builds, native and polling
watch tests (JS additions/deletions, Sass edits, and recovery from JS/Sass errors),
frozen `bundle check`, and a production Jekyll build. All 77 source paths and all
11 generated asset paths were preserved. Modern Sass syntax was applied to 27
existing files while preserving variable, function, and mixin names. Vendor assets are identical, and a
normalized comparison of CSS declarations matches the previous build.

The Sass build is warning-free. Additional checks exercised configurable fonts
and a 24-column grid, the corrected font-weight helper, missing imports, Sass
module additions/edits/deletions, and rejection of legacy syntax in both native
and polling watch modes. The dependency versions were retained when updating npm
and Node metadata in the lockfile.

All 67 HTML routes were retained after the build-tool replacement, and their
markup matches the baseline after normalizing local versus production host URLs.
The diary's shared-script search handler was also
exercised with the development and production output.

Temporary DOM smoke tests verified library startup and menu toggles on six main
routes, gallery filtering with an empty API response, and certificate modal
opening/closing. All 24 used Font Awesome classes have CSS aliases, and referenced
font files are present. These checks do not replace a visual browser review or
testing with the hosted API and authenticated CMS.

### CMS content synchronization

Content was pulled from `portfolio/master` at `062544c` (June 18, 2024) on
November 9, 2026, while preserving the dependency upgrade. The homepage retains
the published arrangement: Folk Ridge, Musician's Profile, Weblife Direct Sales,
Note Along, Name That Movie, and Dota Hero Slider. Ordering now sorts categories
and filenames separately so equal project types do not depend on sort stability.
The pulled updates include the June 2024 resume/CV, work experience, skills,
certificates, and CMS deletions. The refreshed diary search JSON parses correctly.
