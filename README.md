# Rap Esteva Portfolio

A Jekyll portfolio and personal diary using Sass, vanilla JavaScript, GSAP,
Font Awesome, Decap CMS, and project data exported from Strapi v5.

**The website builds and runs from saved project data. Strapi/Heroku can remain
disabled between project updates, including during Netlify deployments.**

## Requirements

| Tool | Project version |
| --- | --- |
| Node.js | 24.22.2, selected by `.nvmrc` |
| npm | 11.x; tested with 11.19.1 |
| Ruby | 3.4.12, selected by `.ruby-version` |
| Bundler | 4.0.16, matching `Gemfile.lock` |

Use **npm** for this Jekyll project. Keep `package-lock.json` and `Gemfile.lock`
in Git. Strapi is a separate project with its own runtime and package manager.

## Installation

Open a terminal in this repository. On Windows, install Ruby with Devkit and
select the Node/Ruby versions above before running:

```powershell
node --version
npm --version
ruby --version
gem install bundler -v 4.0.16
npm ci
bundle install
npm run dev
bundle exec jekyll serve
```

Open [the local website](http://127.0.0.1:4000/),
[portfolio](http://127.0.0.1:4000/portfolio/), or
[contact page](http://127.0.0.1:4000/contact/).

Strapi is optional for ordinary local work. If it is stopped, Jekyll displays a
warning and uses the saved projects. See the [development guide](docs/DEVELOPMENT.md)
for fresh clones, Windows setup, watch mode, and troubleshooting.

## Daily development

Keep Jekyll running in one terminal:

```powershell
bundle exec jekyll serve
```

Watch Sass and JavaScript in a second terminal:

```powershell
npm run watch
```

Edit files inside `source`; Webpack updates `dist/app.js` and
`dist/style.min.css`. Jekyll rebuilds the pages when the generated assets change.
The existing source folders, shared class names, and `webpack.mix.js` filename
are retained.

## Updating content

| Content | Edit with |
| --- | --- |
| Pages, diary posts, resume, skills, and other configured files | Decap CMS at `/admin/`, or the corresponding repository files |
| Portfolio projects, categories, technologies, collaborators, and image references | Strapi v5, followed by a local export and GitHub push |

For project updates:

1. Start your local Strapi v5 manually, or enable the hosted v5 CMS.
2. Save your changes, then start/restart `bundle exec jekyll serve`.
3. Confirm startup reports `Saved ... projects to _data/strapi_projects.json`.
4. Review and commit that updated file, then push to GitHub.

Normal builds use the committed export and never fetch Strapi. A Netlify build
hook by itself does **not** import new CMS edits. See the
[content and CMS guide](docs/CONTENT.md) for the complete workflow.

## Production build and checks

```powershell
npm run prod
bundle exec jekyll build
npm run test:projects
npm run test:contact
npm run test:jekyll
```

Jekyll writes the website into `_site`. Netlify uses
`npm run prod && bundle exec jekyll build` and publishes `_site`.

The contact form uses Netlify Forms and the existing `form 1` identity.
On localhost, valid submissions show **Message not sent** instead of sending.
After deployment, a real CAPTCHA submission is still needed to verify Netlify
receipt and notification delivery.

## Guides

- [Development](docs/DEVELOPMENT.md): installation, commands, Webpack/Sass, tests, and troubleshooting.
- [Content and CMS](docs/CONTENT.md): Decap, project exports, categories, offline builds, and webhook limitations.
- [Deployment](docs/DEPLOYMENT.md): Netlify setup, release checks, contact forms, rollback, and stopping Heroku.
- [Upgrade notes](docs/UPGRADE-NOTES.md): the November 2026 dependency migration and historical verification.

Commit source files, the public project export, both lockfiles, and generated
`dist` assets. Keep `_site`, `node_modules`, local caches, credentials, and CMS
database backups out of Git.
