# Content and CMS

[Back to the README](../README.md)

## Two content sources

Decap CMS edits the GitHub-backed content configured in `admin/config.yml`, such
as page text, diary posts, resume files, work experience, and skills. The portfolio
project collection comes from Strapi v5 and is saved in Git for offline builds.

Decap is configured for the repository's `master` branch. Opening `/admin/` from
localhost still reads/writes GitHub after authentication; it does not edit the
local checkout. Decap's local filesystem backend is not enabled. Pull CMS commits
before starting new local work.

## Project data flow

```text
Strapi v5 (needed only when refreshing projects)
  -> local Jekyll startup exports complete records
  -> _data/strapi_projects.json (commit to GitHub)
  -> Jekyll/Liquid builds _site/projects.json
  -> the browser fetches /projects.json
```

| File | Role |
| --- | --- |
| `_data/strapi_projects.json` | Durable, public project/category export tracked in Git. |
| `_plugins/strapi_v5.rb` | Strapi v5 adapter, validation, export persistence, and offline reads. |
| `projects.json` | Source Liquid template, similar to the existing `posts.json`. |
| `_site/projects.json` | Generated response; do not commit `_site`. |
| `source/js/classes/StaticProjects.js` | One browser download shared by filters, counts, and modal details. |

The export includes project descriptions/dates, categories, main/gallery image
URLs, technology labels/colors, and collaborator display fields. Image files stay
on Cloudinary. The adapter selects website fields rather than copying private
Strapi/provider metadata. This export is not a full CMS/database backup.

## Refresh projects locally

1. Start the separate Strapi v5 project manually using its own runtime:

   ```powershell
   cd D:\dev-stuff\projects\_STRAPI\strapi-rap-v5
   yarn dev:neon
   ```

2. Save project/category changes in Strapi at `http://127.0.0.1:1342/admin`.
3. From this portfolio folder, start or restart Jekyll:

   ```powershell
   bundle exec jekyll serve
   ```

4. Confirm the terminal says `Saved ... projects to _data/strapi_projects.json`.
   A warning that CMS edits were not refreshed means the preview uses older saved
   data; it does not confirm that the latest edits were exported.
5. Review `/portfolio/`, `/projects.json`, and the export diff, then publish:

   ```powershell
   git diff -- _data/strapi_projects.json
   git add _data/strapi_projects.json
   git commit -m "Update portfolio projects"
   git push
   ```

Local `serve` refreshes once at startup and shares the result across templates and
watch rebuilds. Restart after further CMS edits. There is no separate npm sync
command to remember. Failed/incomplete API reads preserve the last complete
saved file and report a warning.

## Refresh from hosted v5

Enable the hosted CMS when needed and save your changes there. In the local
portfolio terminal, set its API endpoint before starting Jekyll:

```powershell
$env:STRAPI_API_URL = 'https://your-hosted-v5.example/api'
bundle exec jekyll serve
```

After reviewing the refreshed export, stop Jekyll with Ctrl+C and clear the override:

```powershell
Remove-Item Env:STRAPI_API_URL
```

Commit/push the export before disabling the hosted CMS again. Public endpoints
must use HTTPS and end in `/api`. The old Heroku v3 API is not compatible with
this v5 refresh. Netlify does not need this environment variable.

The existing `/strapi/` shortcut still points to the legacy v3 admin. Open the
actual local/hosted v5 admin URL when editing the new project collection.

The local v5 CMS already connects to Neon and Cloudinary, so using it to refresh
projects avoids needing a hosted Strapi instance for this workflow.

## Categories and existing values

Manage categories in Strapi's Category collection:

- `name`: the displayed button label.
- `display_order`: category order; the first category is selected initially.
- `key`: stable filter value, with `slug` used when the key is blank.

A project selects one Category; a Category can contain many projects. Existing
`type` values remain in the database as a migration fallback. The adapter emits
the selected category key through the existing browser `type` field. Empty
categories are valid and remain visible.

The API refresh needs Public read access for `project.find`, `category.find`,
`technology.find`, and `collaborator.find`. The website integration never writes
to Strapi or Cloudinary, and needs no database credentials or admin token.

## Keeping Heroku disabled

Normal Jekyll builds and Netlify always read the committed export without API
requests. Ordinary Decap/GitHub CMS changes can deploy while Strapi is offline,
even from a fresh checkout with no previous build/cache. Keep the external
database and Cloudinary accounts available when retaining or editing that data.

A Strapi webhook that only triggers a Netlify build rebuilds the existing saved
export. **It does not fetch new Strapi edits or update the GitHub snapshot.**
Automatic CMS-to-GitHub export would need an additional workflow that saves and
commits updated data before deployment. That automation is not configured here.
