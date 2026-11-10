# Deployment

[Back to the README](../README.md)

For provider changes, database incidents, credential replacement or rebuilding
this setup, read [Migration and recovery](MIGRATION-RECOVERY.md) first.

## Netlify configuration

The existing site deploys the GitHub repository's `master` branch. A push to that
connected branch triggers Netlify's normal build/deploy workflow.

`netlify.toml` defines:

| Setting | Value |
| --- | --- |
| Build command | `bundle exec ruby source/scripts/netlify-projects.rb && npm run prod && bundle exec jekyll build` |
| Publish directory | `_site` |
| Node | `24.22.2` |
| Ruby | `3.4.12` |
| npm install flags | `--include=dev` |
| Jekyll environment | `production` |

Normal Git/Decap builds read committed `_data/strapi_projects.json` without contacting
Strapi. Production build-hook requests refresh the export from the hosted v5 API,
save it to GitHub, and then run the same offline Jekyll build. See
[automatic project refresh](CONTENT.md#automatic-project-refresh).

Source/test folders, dependencies, caches, and documentation are excluded from
the Jekyll output. No CMS credentials belong in the repository or public JSON.

## Prepare a release

From the portfolio folder, using its pinned runtimes:

```powershell
npm run test:projects
npm run test:contact
npm run test:jekyll
npm run prod
bundle exec jekyll build
git diff --check
git status --short
```

Review and commit source changes, the saved project export when updated, and
generated `dist` assets. Include lockfile changes only when dependencies actually
change. Keep `_site`, `node_modules`, `.cache`, credentials, database dumps, and
private migration exports out of Git.

Push to the connected GitHub branch, then inspect Netlify's deployment result.
The normal Git/Decap build makes no CMS requests, so an unavailable CMS does not
block it. A hook refresh fails clearly if the CMS or GitHub persistence is
unavailable; the currently published website stays in place. If a saved export is missing/invalid, the build stops with instructions
to restore or refresh it rather than publishing an empty portfolio.

## Verify the deployed website

- Confirm the new deploy succeeded and is the published version.
- Open `/projects.json`; verify it is valid JSON containing the expected projects
  and categories.
- Check portfolio filtering/counts, info modals, gallery images, and zoom controls.
- In the browser network panel, project data should come from `/projects.json`
  on the website's own domain. Cloudinary continues to serve images.
- Check the homepage, diary, navigation, and authenticated Decap `/admin/` page.
- Complete one real contact-form test as described below.

## Contact form and notifications

The form follows Folk Ridge's native Netlify Forms approach:

- Existing form identity `form 1`, including a matching hidden `form-name`.
- Explicit POST method, UTF-8 encoding, and required name/email/message fields.
- `type="email"` for browser email validation.
- Netlify reCAPTCHA attributes on both the form and its placeholder.
- No action URL, so Netlify supplies its default success page.

Keep Netlify Forms detection enabled. The existing live form was detected under
`form 1`; retaining that name preserves its identity. Confirm the form and spam
settings after the new deployment.

On localhost, valid input opens **Message not sent** and preserves the fields.
This preview notice is based on Folk Ridge's form; Jekyll cannot receive Netlify
submissions. On production/deploy-preview hosts, native form submission remains
enabled. The contact form uses no Strapi or Heroku endpoint.

After deploying, manually send one test message with a completed CAPTCHA, then
check **Netlify Forms > form 1** and **Forms > Submission notifications**. Confirm
receipt, check the spam list if needed, and confirm the intended recipient is
enabled/confirmed for notifications. Local tests intercept requests and do not
prove hosted CAPTCHA acceptance or email delivery.

References: [Netlify Forms setup](https://docs.netlify.com/manage/forms/setup/),
[spam protection](https://docs.netlify.com/manage/forms/spam-filters/), and
[submission notifications](https://docs.netlify.com/manage/forms/notifications/).

## Stopping Heroku after the switch

Publish and verify the saved-data website first. The older deployed version used
the v3 API directly; stopping that backend before replacing the live frontend
would affect its portfolio.

After verification, the new website and ordinary Netlify rebuilds can continue
while Strapi is disabled. To update projects later, enable hosted v5 or use local
v5 and refresh/commit its export, or let the configured hosted Strapi webhook
refresh and commit it automatically; see the [content guide](CONTENT.md).

Stopping one app and cancelling a shared Heroku plan are different actions.
Check other apps before cancelling an account-wide Eco subscription. Keep Neon,
Cloudinary, and independent backups; the JSON export is not a full database backup.
See [Heroku's subscription behavior](https://devcenter.heroku.com/articles/eco-dyno-hours).

## Rollback

Netlify can republish a previous successful deploy from its Deploys view. Check
which API/data source that older version uses before rolling back. Retain the old
CMS until the new website has been verified. Do not delete databases or media as
part of a frontend rollback.
