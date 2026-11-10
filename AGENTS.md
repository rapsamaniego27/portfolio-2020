# Portfolio context for Codex

Before work involving CMS hosting, database/media recovery, credentials, Netlify
hooks, repository moves or the static portfolio API, read
[docs/MIGRATION-RECOVERY.md](docs/MIGRATION-RECOVERY.md). It records the configured
systems, required settings, recovery constraints and the reasons behind them.

Preserve the existing project structure and field names. Normal Git/Decap builds
must work with Strapi offline; CMS hook builds must save the validated public
export to GitHub before publishing. The public JSON is not a full CMS backup.

Inspect current state instead of assuming historical counts, prices, paths or
account plans remain unchanged. Keep credentials and private backups out of Git,
chat, rendered output and logs. The owner starts local Strapi manually.
