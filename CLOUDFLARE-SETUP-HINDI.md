# Cloudflare deployment (test first)

## What changed
- The existing public HTML/CSS/JS and admin screens are copied into `public/` without redesign.
- `_worker.js` replaces the Node server at the edge and uses Cloudflare D1 for content/admin/session data and a Workers KV namespace for admin uploads.
- `server.js` and the original `data/` files are retained as a backup/reference. Do not deploy the old Node server for the Cloudflare version.

## Required bindings
Create a D1 database named `usman-portfolio-db` and a **KV namespace** (not R2) for uploads in the Cloudflare dashboard.
Then open the deployed Worker → Settings → Bindings and add:
1. D1 database binding: variable name `DB`, select `usman-portfolio-db`.
2. KV namespace binding: variable name `UPLOADS` (already declared in `wrangler.toml`). Do NOT bind an R2 bucket named `UPLOADS` — the code uses the KV API and uploads would fail.
3. Static Assets binding is configured by `wrangler.toml` as `ASSETS`.

The Worker creates its D1 tables and imports the current `data/content.json` content on the first request. Do not delete the D1 database after editing content.

## Deploy
1. Keep your current Render deployment unchanged.
2. Upload these files to a separate GitHub test repository (or a separate branch). Do not overwrite the live repository until testing is complete.
3. In Cloudflare, create a Worker connected to that test repository. Build/deploy using Wrangler and `wrangler.toml`.
4. Add the `DB` and `UPLOADS` bindings above, then open the `workers.dev` test URL.
5. Test `/`, all six pages, `/admin/login`, login, save content, upload image, refresh, and confirm saved content persists.
6. **Before the first request**, add Worker secrets `ADMIN_USERNAME` and `ADMIN_PASSWORD` (`npx wrangler secret put ADMIN_PASSWORD`) so the public default password is never created. If you skip this, the login is `admin` / `Admin@123` — change it immediately in Admin Settings.

## Important
- Do not attach your custom domain until all tests pass.
- This is a migration adapter; no claim is made that the browser-level layout has been visually verified. Compare screenshots on desktop/mobile before switching.
- The initial content comes from the ZIP's `data/content.json`. Any edits made only in the old Render filesystem and not present in this ZIP will need a separate export/import.
