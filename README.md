# satta-next

Next.js 15 rebuild of the Laravel `realsata` / `super_7` result sites: same public pages and admin features, a faster navigation bar, and a new **SEO & Content** admin section.

## Run locally

```powershell
copy .env.example .env.local   # then fill in the DB values
npm install
npm run db:seed                # creates tables, roles, admin user, games, SEO pages + content
npm run dev                    # http://localhost:3000, admin at /admin
```

`node scripts/migrate.mjs --seed --demo` also fills demo results for the current month.

## Using the Hostinger database

1. hPanel → Databases → **Remote MySQL**: add the IP of the machine that runs this app.
2. Put the host from hPanel (e.g. `srvXXXX.hstgr.io`) and your DB name/user/password in `.env.local`.
3. Run `npm run db:migrate`. It only creates missing tables and adds missing columns
   (`seo_pages.page_content`, `site_settings`), so it is safe on the existing Laravel database:
   existing users, roles, games and results keep working, including Laravel bcrypt passwords.
4. `npm run db:seed` adds the new permissions (`seo-content view`, `settings view`, `games assign users`),
   default SEO content and settings without overwriting existing rows.

Timestamps are read and written in `DB_TIMEZONE` (default `+00:00`, the same as Laravel's `UTC`).

## Production

```powershell
npm run build
npm start          # or run behind PM2 / Hostinger Node.js hosting
```

Uploads go to `UPLOAD_DIR` (default `./storage/uploads`) and are served from `/uploads/...`.

## What's where

| Area | Path |
| --- | --- |
| Home / live result logic (port of `FrontController::home`) | `src/lib/results.ts` |
| Public pages | `src/app/(site)/` |
| JSON API (`/api/live-results`, `/api/chart-games`, …) | `src/app/api/` |
| Admin panel | `src/app/admin/(panel)/` |
| SEO & Content manager (new) | `src/app/admin/(panel)/seo-content/` |
| Schema + seed | `scripts/migrate.mjs`, `scripts/content.mjs` |
