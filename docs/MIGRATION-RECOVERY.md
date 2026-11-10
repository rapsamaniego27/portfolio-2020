# Migration, recovery and Codex handoff

Last reviewed: **November 10, 2026 (Asia/Taipei)**.

Read this before moving the CMS, changing database/media providers, restoring data,
replacing tokens, or changing the static project export. These are the observed
settings, not a promise that provider plans, prices or retention rules stay the
same. Check the current accounts and official documentation before a migration.

Use [the configuration inventory](#4-github-netlify-and-webhook-configuration) for
publishing failures, [the host-move procedure](#7-if-render-becomes-paid-unavailable-or-unsuitable)
for a Render change, and [database recovery](#8-if-the-database-is-corrupted-empty-or-missing-records)
for missing/corrupted data. Keep [the backup inventory](#6-backup-inventory-and-what-each-backup-can-recover)
available independently of the running CMS.

## 1. What must keep working

Rap is the only editor and may update projects only four to six times a year.
The portfolio must remain available when Strapi sleeps or is disabled for months.
Avoid adding a paid subscription just to keep the editor awake.

```text
An edit in hosted Strapi
  -> Strapi's portfolio_rap webhook calls Netlify's build hook
  -> Netlify fetches complete public projects/categories from Strapi v5
  -> Netlify saves _data/strapi_projects.json to GitHub
  -> Jekyll/Liquid generates _site/projects.json from that saved export
  -> Netlify publishes the website
  -> browser JavaScript fetches /projects.json on the portfolio's own domain

An ordinary GitHub/Decap change
  -> Netlify reads the committed export without contacting Strapi
  -> Jekyll generates the website, even if the CMS is offline
```

**Why:** fetching only during a build without saving back to GitHub would let a
later offline build revert to an older export. Fetching Strapi in visitors'
browsers would bring back the sleeping-server delay.

## 2. Systems and locations to identify first

| Part | Recorded location/configuration | Why it matters |
| --- | --- | --- |
| Portfolio source | `D:\dev-stuff\projects\portfolio`; GitHub `rapsamaniego27/portfolio-2020`, branch `master` | Owns the website, Decap content, saved JSON and Netlify build script. |
| CMS source | `D:\dev-stuff\projects\_STRAPI\strapi-rap-v5`; private GitHub `rapsamaniego27/strapi-rap-v5`, branch `master` | Owns schemas, plugins and backend configuration; it is a separate application. |
| Website | [rapesteva.com](https://rapesteva.com); Netlify project `rapesteva` | Hosts pages, static JSON and Netlify Forms. |
| CMS | [Strapi admin](https://strapi-rap-v5.onrender.com/admin); API base `https://strapi-rap-v5.onrender.com/api` | This is the current v5 endpoint, not the old Heroku API. |
| Render service | `strapi-rap-v5`; ID `srv-dbpdepgn74is73dl6ibg`; Ohio | Runs Strapi; it does not own the durable database or images. |
| Database | Neon dashboard project originally named `portfolio-rap`; PostgreSQL database **`strapi_rap_v5`** | The dashboard project name and PostgreSQL database name are different settings. |
| Media | Existing Cloudinary account | Stores actual image files; the database/export store references and metadata. |
| Legacy system | Heroku app `strapi-rap`, Strapi v3; original MongoDB | Historical recovery source only. Do not substitute its v3 responses for the v5 API. |

Paths can change after a reinstall. Find the real checkouts and inspect Git remotes
instead of assuming these drive letters still exist. Do not assume a v5 Heroku
app exists: the confirmed v5 deployment is on Render. Check actual account state
before changing or cancelling anything shared with other projects.

## 3. Files and conventions to preserve

| File/setting | Preserve or review | Reason |
| --- | --- | --- |
| `_data/strapi_projects.json` | Keep tracked in Git; pull automated commits before local work. | Durable public export for fresh/offline builds. |
| Root `projects.json` | Keep as its Liquid source template. | Jekyll generates the served response; do not overwrite the template with API data. |
| Root `posts.json` | Preserve its separate diary workflow. | This migration covers portfolio projects, not all content. |
| `_plugins/strapi_v5.rb` | Retain pagination, public-field filtering, validation and atomic saving. | Modals need complete relations; partial API reads must not replace good data. |
| `source/scripts/netlify-projects.rb` | Preserve the hook-only refresh and GitHub save-before-render order. | Provides automatic updates without sacrificing offline rebuilds. |
| `source/js/classes/StaticProjects.js` | Keep its same-origin JSON filtering/detail behavior. | The browser does not need a live CMS connection. |
| CMS `src/api`, `src/extensions`, `src/admin`, `config`, `scripts/lib` | Keep with the correct source commit and lockfile. | Custom behavior is outside the database and outside `node_modules`. |
| Project field names | Preserve `category`, legacy `type`, `technologies`, `collaborators`, `main_image`, `gallery`, `visibility`, `modal_type`, `legacyId`. | Existing exporters, filters and migration mappings depend on them. |
| Relation IDs and join tables | Restore all related tables together. | Project-category join tables and other relationship tables are normal; restoring only `projects` loses links. |
| `documentId` and legacy mappings | Preserve them during a full database move. | The public export uses v5 document IDs; original migration mappings avoid duplicate imports. |

Project → Category is many-to-one. Keep the existing legacy `type` enum as the
migration fallback unless a separate, rehearsed migration removes it. Preserve
category `key`/`slug` values and `display_order`: these control filtering and order.
Preserve technology HEX colors and their Color Picker custom-field schema.

## 4. GitHub, Netlify and webhook configuration

These settings are required together; a successful Netlify deploy by itself does
not prove that new CMS data was fetched.

| Setting | Recorded value/requirement | Why |
| --- | --- | --- |
| Netlify repository/production branch | `rapsamaniego27/portfolio-2020`, `master` | Hook refreshes are intentionally restricted to production `master`. |
| Netlify build command | `bundle exec ruby source/scripts/netlify-projects.rb && npm run prod && bundle exec jekyll build` | Refresh/persist first, then build assets and render Liquid. |
| Publish directory | `_site` | Generated output; never publish the source repository directly. |
| Portfolio runtimes | Node `24.22.2`, npm `11.x`, Ruby `3.4.12`, Bundler `4.0.16`; both lockfiles retained | These differ from the CMS runtime. Do not copy Node 22 settings into this frontend build. |
| Build environment | `NPM_FLAGS=--include=dev`, `JEKYLL_ENV=production` | Webpack/Sass dependencies are build-time development dependencies; Jekyll must use production behavior. |
| `STRAPI_API_URL` | In `netlify.toml`: `https://strapi-rap-v5.onrender.com/api` | Update this when the CMS hostname changes. Inspect UI env overrides too; remove stale duplicate settings. |
| `PORTFOLIO_SNAPSHOT_TOKEN` | Netlify secret with a value for **Production only** | Lets the hook build durably update GitHub. No token is needed by the browser. |
| Token access | Fine-grained GitHub token, only `portfolio-2020`, **Contents: Read and write** | Read-only access cannot commit fresh JSON. No account-level permissions are needed. |
| Token scope in Netlify | Builds only if available; keep Production context and secret masking. | At setup, free-plan controls also included Functions/Runtime; no paid upgrade was added to narrow scopes. Do not put a value in preview/branch/local contexts. |
| Token expiry/rotation | Record expiry privately; replace before expiry. Test replacement, then revoke old token. | Expiry or missing write access stops hook refreshes; existing published pages and normal offline builds remain usable. |
| GitHub branch policy | Allow this narrowly scoped automation to update the snapshot. | New branch protection rules can block Contents API writes. Do not force-push or weaken rules blindly; choose an approved integration if policies change. |
| Automatic commit message | `Update portfolio projects [skip netlify]` | The original hook build publishes the JSON; the commit must not cause a second build loop. |
| Hardcoded repo/branch | `REPOSITORY`, `BRANCH`, and the snapshot path in `source/scripts/netlify-projects.rb` | A repository move/branch rename needs a code change as well as UI changes and token access. |
| Hook metadata | `NETLIFY=true`, `CONTEXT=production`, `BRANCH=master`, nonempty `INCOMING_HOOK_URL` | The script deliberately skips local runs, previews and ordinary Git builds. |
| Hook body | JSON in `INCOMING_HOOK_BODY`, including Netlify's URL-encoded form | The script decodes data only; it never executes or logs webhook content. |
| Strapi webhook | Existing name `portfolio_rap`; target is Netlify's generated build-hook URL | Store the URL privately; it can trigger builds. Replace it if the Netlify project/hook changes. |
| Per-model entry events | Create/update/delete for project, category, technology and collaborator | These changes affect cards, categories, modals and badges. Publish/unpublish apply only if Draft & Publish is enabled later. |
| Public API permissions | `find` on project, category, technology and collaborator | Required for complete export/populated relations. Do not open write/upload/private-user permissions to fix a 403. |

**Strapi v5 webhook trap:** inspect the per-model event selections in the admin,
not just the legacy database `events` array. An empty legacy array does **not**
prove the webhook is inactive. On the verified setup, portfolio model events were
already enabled. Other selected models such as skills are ignored by the export
script; it handles projects/categories/technologies/collaborators only.

The website currently needs no admin API token or database password to fetch
public portfolio data. If read access is made private in future, update the
server-side exporter deliberately; never put a Strapi admin token in browser code.
Review whether `findOne` is needed before adding it; it is not required just to
export the collection with populated fields.

Keep the Render GitHub installation/connection separate from the snapshot token:
Render reads the **private CMS repository**; the Netlify token writes the
**portfolio repository**. Decap's GitHub sign-in is another integration and does
not automatically provide the build script with a token.

## 5. CMS hosting environment to carry to a new provider

Start with the existing Strapi version and lockfile. Change hosting first; upgrade
Strapi/plugins separately after recovery or migration is verified.

Recorded CMS runtime: Strapi **5.61.0**, Node **22.23.4**, npm **10.x**;
`npm ci` uses `package-lock.json`. The current host uses:

| Setting | Value |
| --- | --- |
| Build | `npm ci && npm run build` |
| Start | `npm run start:render` (can be reused on another compatible Node host) |
| Health path | `/_health` (expected HTTP 204) |
| Branch/root | `master`, repository root |
| Host/network | `HOST=0.0.0.0`, use the provider's `PORT` |
| Environment | `NODE_ENV=production`, `TRUST_PROXY=true`, `BROWSER=false`, `TZ=UTC`, `STRAPI_TELEMETRY_DISABLED=true` |

The start script limits V8 old-space to **320 MB**; it does not cap total process
RAM. Render Free was deployed with 512 MB RAM and 0.1 CPU. Successful startup does
not guarantee memory headroom for image processing or every admin operation.
Measure real editing/upload usage before deciding a new host is adequate.

Render supplies `RENDER_EXTERNAL_URL`. Production server/CORS config uses it when
`PUBLIC_URL` is unset. **On another provider, set `PUBLIC_URL` to the new HTTPS CMS
origin.** Set `CORS_ORIGINS` if needed to the allowed admin origin(s); avoid an
unrestricted wildcard with credentials. Server-side Netlify fetching does not
need a browser CORS exception. Rebuild the admin after URL/config changes.

Do not copy local `HOST=127.0.0.1`, port 1342, local `PUBLIC_URL`, or SQLite settings
into the hosted service. Keep provider secrets out of Git and build output.

### Plugins and custom code to retain

| Component | Recorded version/location | Reason |
| --- | --- | --- |
| Users & Permissions | `@strapi/plugin-users-permissions` `5.61.0`, plus `src/extensions/users-permissions/` | Public read roles, legacy user fields/relations and the production registration guard must survive. |
| Color Picker | `@strapi/plugin-color-picker` `5.61.0` | Technology colors use a custom field backed by the existing HEX string values. |
| Suggested swatches | `src/admin/components/SuggestedColorsPanel.jsx`, `src/admin/utils/color-suggestions.mjs`, `src/admin/app.js` | The four muted suggestions are project code, not a remotely hosted color service. Preserve the editor integration and validation. |
| Bulk Editor | `strapi-plugin-bulk-editor` `0.1.11`, plus `src/extensions/bulk-editor/` | The extension adds Super Admin restrictions, field protections, relation handling and rollback behavior; reinstalling the upstream package alone is insufficient. |
| Cloudinary upload provider | `@strapi/provider-upload-cloudinary` `5.61.0`, `config/plugins.js`, `src/extensions/upload/`, `src/index.js` | Preserve upload behavior, non-overwrite settings and replacement/deletion protections. |
| Local launch/build guards | `scripts/neon.cjs`, `scripts/lib/database-safety.cjs`, `scripts/lib/media-settings.cjs` | Prevent wrong-target writes and separate admin build/runtime behavior from editing. |

Install from the lockfile, not by copying `node_modules` between machines. Test
plugin compatibility before a Strapi upgrade. The current project does not need
every plugin used by Folk Ridge; compare its own manifest and extensions first.

### Secrets to preserve securely

| Secret names | Why they must be available |
| --- | --- |
| `APP_KEYS` | Signing keys; changing them can invalidate existing signed sessions/cookies. |
| `ADMIN_JWT_SECRET`, `JWT_SECRET` | Existing admin/content authentication configuration. |
| `API_TOKEN_SALT`, `TRANSFER_TOKEN_SALT` | Existing API/transfer token verification. |
| `ENCRYPTION_KEY` | Decrypts secrets stored in the database; a database dump alone is not a replacement for this key. |
| `DATABASE_URL` | Actual PostgreSQL target and login. Update every writer when credentials/target change. |
| `CLOUDINARY_NAME`, `CLOUDINARY_KEY`, `CLOUDINARY_SECRET` | Existing media account and new-upload access. |

The ignored CMS `.env.neon` contains the existing live profile; hosted settings
are stored separately in Render. They do not automatically update each other.
Keep an independent encrypted/password-manager copy. A Git clone cannot recover
ignored secrets, private dumps or local migration reports.

Do not generate replacement Strapi secrets just because the application is moving
hosts. Intentional secret rotation is separate from a hosting migration and may
need token/session/provider reconfiguration. Never copy credentials from old chat
messages; previously exposed credentials should be replaced through the accounts.

### Database and media flags

```dotenv
DATABASE_CLIENT=postgres
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
DATABASE_CHANNEL_BINDING=true
DATABASE_POOL_MIN=0
DATABASE_POOL_MAX=2
ALLOW_REMOTE_DATABASE_WRITES=true
MEDIA_PROVIDER=cloudinary
MEDIA_WRITE_ENABLED=false
MEDIA_UPLOAD_ENABLED=true
MEDIA_REPLACE_ENABLED=false
MEDIA_DELETE_ENABLED=false
PUBLIC_REGISTRATION_ENABLED=false
```

**Why:** small connection pools suit the current low-load setup; verified TLS
protects the database connection. New media uploads are allowed, while replacement
and deletion remain protected. Cloudinary uploads use `overwrite=false`.
`PUBLIC_REGISTRATION_ENABLED=false` activates the production controller guard;
preserve that extension as well as the environment setting.

If changing PostgreSQL providers, verify their TLS/channel-binding support and
connection requirements before copying these settings. Do not disable certificate
validation to silence a connection error. Neither a Render disk nor a Render
database is needed for this Neon/Cloudinary arrangement.

## 6. Backup inventory and what each backup can recover

| Copy | What it preserves | What it cannot replace |
| --- | --- | --- |
| Portfolio Git history | Website/Decap source, public JSON export, build configuration | Full CMS data, admin accounts, private fields, image binaries and secrets. |
| CMS private Git repository | Schemas, custom extensions, plugins' declared versions, lockfile | PostgreSQL contents, ignored profiles, migration reports and Cloudinary originals. |
| PostgreSQL custom dump | Database tables, content, relations, media metadata and Strapi configuration at dump time | External images, host settings, separate secrets; provider roles/ownership may need mapping. |
| Neon recovery history | A provider-supported earlier database state within its actual history window | An unlimited history or an independent off-provider backup. Check current retention/plan first. |
| Cloudinary media backup | Original images and identifiers needed by media references | Project descriptions, category relations and CMS accounts. |
| Old v3 MongoDB dump | Historical source before the v5 migration | New v5 entries, later edits, new categories, current admin/permission state. |

Create a fresh database dump before migrations, schema/plugin upgrades and recovery
cutovers. Keep dated copies off this PC and outside the same database/provider
account, encrypted and access-controlled. Retain Cloudinary originals and record
their identifiers/URLs. A backup on the same failing drive is not sufficient.

Record backup timestamp, source database/server version, matching CMS source
commit, checksum and restore result. Listing an archive is useful but does not
prove it can be restored; rehearse a restore into an isolated empty target.

### Existing local backup locations (historical, not necessarily newest)

Under `D:\dev-stuff\projects\_STRAPI\strapi-rap-v5\exports\`:

- `render-deployment-2026-11-10T08-33-06-632Z\strapi_rap_v5.dump`
- `heroku-deployment-2026-11-10T07-46-52-213Z\strapi_rap_v5.dump`
- `neon-categories-11-10-2026-2026-11-10T03-24-23-683Z\strapi_rap_v5.dump`
- `mongo-2026-11-09T08-26-06-225Z\` (legacy source backup)

The Render backup is **before** the later BPI trade edit. Its manifest recorded
56 tables, 46 projects, 6 categories and 89 media records. Use its timestamp, not
its convenient filename, to decide whether it is the right restore point.

Private manifests/reports include `reports/render-backup-state.json`,
`reports/render-verification.json`, export `backup-manifest.json`, and the ignored
`migration-state/` mappings. The full portfolio folder backup is
`D:\dev-stuff\projects\portfolio-backup-11-10-2026`.

One-off backup/verification helpers used in this session live under ignored
`portfolio/.cache/`; **do not assume they exist in a fresh clone**. The Node/Ruby
runtimes previously used under a Windows Temp folder are also not durable tools.
Reinstall the pinned versions when needed.

## 7. If Render becomes paid, unavailable, or unsuitable

1. **Preserve the current website and export first.** Pull the portfolio repository;
   compare live `/projects.json` with GitHub. If an export is stale and the CMS is
   healthy, perform one verified hook refresh before stopping it.
2. **Back up Neon and media references; securely retain secrets and source.** Moving
   a server does not require moving either Neon or Cloudinary.
3. **Choose local-only editing or a replacement host.** Local Strapi already edits
   the same Neon database. For infrequent updates, it avoids a CMS hosting bill.
   Confirm current pricing/limits before creating resources; the old Free/Hobby
   plan name is not evidence that a service remains free.
4. **Deploy the unchanged CMS source on the new host.** Restore production flags,
   secrets, provider port, HTTPS origin, database and Cloudinary connection. Keep
   the old host until health, existing admin, API relations and uploads are checked.
5. **Change `STRAPI_API_URL` in portfolio `netlify.toml`.** Include `/api`. Review
   Netlify env overrides and any local override. Update a CMS shortcut/custom
   domain/bookmark separately if it still points at the old admin.
6. **Retain the existing Netlify webhook target when the website stays on Netlify.**
   It is stored in PostgreSQL and should follow the full database, but verify its
   enabled state, per-model events and destination in the new admin.
7. **Run the complete update test before retiring the old service.** A healthy
   admin page alone does not prove static publishing works. Then stop the old CMS
   service without deleting Neon, Cloudinary, repositories or independent backups.

### Local-only editing fallback

From the CMS project, the owner starts `npm run dev:neon` (or `yarn dev:neon`).
From the portfolio, start/restart `bundle exec jekyll serve`, review the refreshed
export, commit it and push. Ordinary Netlify builds publish it without a live CMS.
Start the local Strapi server manually; do not launch a duplicate server on port
1342. The hosted webhook cannot reach a PC's `127.0.0.1`.

`scripts/neon.cjs` validates more than the connection string: it requires a direct
`.neon.tech` host, rejects a `-pooler` host, and checks the target against ignored
`reports/neon-import.json`. A moved/restored Neon branch has a different host.
Verify it and update the local attestation workflow deliberately; **do not rerun
the old import just to recreate that report**. A move away from Neon also needs
a reviewed launcher change, not merely a new `.env.neon` URL.

## 8. If the database is corrupted, empty, or missing records

### Contain the problem

1. Keep the published static website and GitHub JSON intact. Save their known-good
   versions. Do not trigger export hooks from a suspect or half-restored CMS.
2. Stop CMS writers: the hosted service and any local Neon editing sessions. Pause
   the Strapi webhook/related queued refreshes. Check whether other writers exist.
3. Preserve the suspect database and logs if readable; make a diagnostic copy.
   Confirm the actual host, database, role and branch before calling it corruption.
   A wrong `DATABASE_URL`, permission error or empty new branch can look like loss.
4. Choose an appropriate provider recovery point or an independent verified dump.
   Read Neon’s current history window and restore behavior; a point-in-time restore
   is not automatically available months later.

### Rehearse recovery separately

5. Use an isolated Neon branch/project or an empty local rehearsal database.
   Prefer a full database restore with all relation/configuration tables. Do not
   restore only `projects`, run a destructive import against production, or add
   `--clean`/`--create` to a guessed target.
6. Use compatible PostgreSQL tools. This database/backup used PostgreSQL 18.
   Supply credentials through protected environment/password-file mechanisms;
   do not paste a password-bearing URL into command history or documentation.
7. Check the restored data before attaching Strapi. Retain the matching Strapi
   version/source and original encryption/signing secrets. The application's first
   startup can run schema synchronization; rehearse it against the isolated copy.
8. Verify document IDs, descriptions, dates, visibility, modal types, category keys,
   technology colors, relation links/gallery order, media metadata and Cloudinary
   URLs. Verify admin login, roles and API permissions. Counts alone are insufficient.

Read-only archive inspection example (the path must be reviewed on the actual PC):

```powershell
$cmsRoot = 'D:\dev-stuff\projects\_STRAPI\strapi-rap-v5'
$dumpFile = Join-Path $cmsRoot 'exports\render-deployment-2026-11-10T08-33-06-632Z\strapi_rap_v5.dump'
Get-FileHash -LiteralPath $dumpFile -Algorithm SHA256
& 'C:\Program Files\PostgreSQL\18\bin\pg_restore.exe' --list $dumpFile
```

For the actual restore, configure and independently verify `PGHOST`, `PGPORT`,
`PGDATABASE`, `PGUSER`, TLS trust and credentials for the **empty rehearsal target**
first. A custom archive uses `pg_restore`; a plain SQL dump uses the corresponding
SQL restore process. Resolve version/extension/role compatibility before cutover.
No automatic production overwrite command is provided here.

### Respect the application's target checks

- Remote database startup requires `ALLOW_REMOTE_DATABASE_WRITES=true` and the
  database name **`strapi_rap_v5`** in `scripts/lib/database-safety.cjs`.
- Local PostgreSQL rehearsals require `ALLOW_LOCAL_DATABASE_WRITES=true` and a
  database name beginning **`rap_v5_test_`**. SQLite is restricted to `.tmp/`.
- `DATABASE_URL` takes precedence over separate host/name fields. Remove or
  override an inherited live URL before connecting a rehearsal to localhost.
- Do not bypass these guards merely to make a restore start. If the target needs
  a different name, review that change explicitly and keep it isolated from live.

### Cut over only after validation

9. Point the hosted service and local profile at the validated target and restart
   them deliberately. Credentials or host changes must reach every environment.
10. Compare the restored public content with the newer committed website export.
    A restore can be valid but older than GitHub. Reconcile intended later edits
    before allowing it to overwrite the newer public JSON.
11. Enable/test the webhook, verify GitHub saving and Netlify publication, then
    resume editing. Keep the old database/copy until the result is confirmed.

If there is no usable database backup, the JSON export may help reconstruct
public project content. It is **not a full restore**: it lacks accounts/passwords,
private fields, complete media metadata and original image binaries. Treat that
as a separate reconstruction project with new mappings and explicit validation.

## 9. If Cloudinary images fail or must move

Check a saved image URL directly and distinguish a bad reference from account,
quota, delivery or credential problems. Restoring PostgreSQL does not restore a
deleted Cloudinary image. Preserve originals/public identifiers and verify main
images, every gallery image and existing transformation URLs.

Keep the current Cloudinary account when only moving Strapi. If changing media
providers, copy/verify assets before switching the provider, migrate database
references deliberately, and regenerate/commit the public export. Existing JSON
continues pointing at the old image URLs until it is refreshed. Do not bulk delete
old assets or turn on `MEDIA_WRITE_ENABLED=true` to solve an upload error.

## 10. If Netlify, GitHub, the domain or a branch changes

| Change | Reconfigure | Reason |
| --- | --- | --- |
| New Netlify project | Repository/branch, build/publish/runtime settings, production secret and build hook; update Strapi's destination | Hooks and environment variables belong to the old project. |
| New frontend host | Equivalent build context/hook detection and durable GitHub save, domain/DNS, forms and Decap authentication | The sync script currently expects Netlify metadata. Merely copying a build command to another host does not activate hook refreshes. |
| Portfolio repo/owner/branch rename | Git remotes, Netlify connection, token repository access, sync `REPOSITORY`/`BRANCH`, and `admin/config.yml` | Several integrations intentionally target the current repository and `master`. |
| CMS repository move | Render/new-host Git installation access, branch, commands and environment | The private backend repository is independent of the frontend token. |
| Domain/HTTPS change | Registrar/DNS, host domain configuration, Jekyll `url`/`baseurl`, links, Decap OAuth redirect configuration as applicable | A successful preview deployment does not establish that the production domain/auth callbacks work. |

The contact form uses Netlify Forms with the existing **`form 1`** identity and
Netlify reCAPTCHA. Preserve form detection, hidden `form-name`, POST behavior,
spam controls and submission notifications. Another frontend host needs an
alternative form service/integration. A real completed-CAPTCHA message is needed
to verify receipt/notification delivery; local UI tests do not prove delivery.

Decap is GitHub-backed, configured in `admin/config.yml`; it is separate from the
Strapi project editor. Retain its working OAuth provider/authorization settings
and check `/admin/` after a host/domain migration. Do not assume the snapshot PAT
replaces Decap authentication. See [DEPLOYMENT.md](DEPLOYMENT.md).

## 11. Verification checklist and troubleshooting

| Check/symptom | Interpretation or next check |
| --- | --- |
| CMS `/_health` = 204; `/admin` = 200; `/admin/init` has an existing admin | Backend and intended account database are available. A blank first-admin setup screen is a reason to verify the target, not create another production admin. |
| Public projects/categories = 200, with main image, gallery, technologies, collaborators and category populated | The exporter can read everything used by the website. Verify pagination and permissions after restoring roles. |
| Private `/api/users` = 401/403; writes/uploads require admin authentication | Read-only public access has not become a general write/private-data API. |
| `GitHub snapshot saved` in the **hook** build | New export was saved durably before rendering. Check the actual commit and live JSON too. |
| `GitHub snapshot unchanged` | API fetch/GitHub read succeeded; there was no file write to test. A real intended edit is needed to verify a replacement token's write permission end to end. |
| Only `Using the committed export` | Ordinary/offline build, or missing hook/context metadata; it does not prove CMS edits refreshed. |
| GitHub 401 | Check token validity, expiry/revocation and the production variable value. |
| GitHub 403/404 on save/read | Check selected repository, Contents write access, owner/branch/path, and repository policies. Do not broaden access to unrelated repositories. |
| Strapi 403 | Check the required Public read permissions and populated relations, not GitHub credentials. |
| API 502/503/504 or timeout | Check sleeping/startup, database connectivity and memory logs. The exporter retries hosted requests; existing saved data must remain intact. |
| Repeated GitHub 409 | Concurrent snapshot save. The script refetches API data and retries up to three times; retry the build rather than force-pushing. |
| Empty/partial output after restore | Freeze hooks; verify backup completeness, relations, category mappings and pagination before re-exporting. |
| Upload fails | Check Cloudinary credentials/quota, media flags/provider configuration and runtime memory. Do not assume all 512 MB is application headroom. |
| Local `dev:neon` fails after changing host | Check the direct-host and verified-import report guards, not just `.env.neon`. |

Before cutover, run the relevant existing checks:

```powershell
# Portfolio repository
npm run test:projects
npm run test:contact
npm run test:jekyll
npm run test:project-sync
npm run prod
bundle exec jekyll build

# CMS repository, with its Node version
npm test
npm run build
```

Also prove a normal clean Git/Decap build works with Strapi unavailable. Test one
intended edit through the hook, compare GitHub/live JSON, then test an unchanged
hook for no duplicate commit. Check filters, info modals, zoom/gallery images,
mobile layout, Decap authentication and contact delivery where affected.

## 12. Evidence and remaining reminders for the next Codex session

- Render startup/admin/API and all 20 compared content tables passed against the
  predeployment backup on November 10. Historical baseline: 46 projects,
  6 categories, 89 media records. These counts can legitimately change later.
- Portfolio sync code: commit `fc10714`; first verified automatic JSON save:
  `70d2a0f`. That save contained the later BPI trade edit. Prefer current Git
  history over these historical hashes when selecting a source/restore point.
- A replacement Netlify token was saved by the owner and authenticated in a
  successful hook rebuild. Data was unchanged, so that replacement test did not
  exercise a new GitHub write. Revocation of the old exposed token was requested
  but **not independently confirmed**. Verify status without printing token values.
- Existing CMS dependency advisories were not eliminated by changing hosting.
  Review the backend's audit/exposure notes when upgrading; do not force a Strapi
  downgrade or incompatible transitive override during a recovery.
- No scheduled off-provider database/media backup or unlimited retention was
  established in this session. Arrange and verify a durable backup routine rather
  than assuming the historical local dumps stay current.

### Copyable prompt for a future session

> Read `AGENTS.md` and `docs/MIGRATION-RECOVERY.md` in the portfolio before changing
> hosting, data or publishing. Inspect the current repositories/accounts and keep
> the existing architecture and field names. Preserve the committed public JSON,
> full database/media backups and Strapi secrets. Ordinary builds must work with
> Strapi offline; CMS hook builds must save fresh JSON to GitHub before publishing.
> Rehearse recovery in an isolated target, preserve IDs/relations and account
> configuration, and verify the complete publishing flow before cutover.

## Official references to recheck

- [Netlify build hooks](https://docs.netlify.com/build/configure-builds/build-hooks/)
  and [build environment metadata](https://docs.netlify.com/build/configure-builds/environment-variables/)
- [Netlify deploy skipping](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/)
- [GitHub Contents API](https://docs.github.com/en/rest/repos/contents)
- [Render Free limitations](https://render.com/docs/free) and
  [provider environment variables](https://render.com/docs/environment-variables)
- [Strapi database configuration](https://docs.strapi.io/cms/configurations/database)
  and [deployment secrets](https://docs.strapi.io/cms/installation/docker)
- [Neon instant restore](https://neon.com/docs/postgres/backup-restore/branch-restore)
  and [history window](https://neon.com/docs/postgres/backup-restore/history-window)
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
  and [pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html)
