@AGENTS.md

## QA Rule (MANDATORY)

After ANY code change that touches user-facing functionality, you MUST run automated
browser QA using /qa against the deployed URL before reporting the work as complete.
Do NOT skip this. Do NOT say "you can test it at..." — TEST IT YOURSELF.

The test plan is in `.gstack/qa-test-plan.md`. Run every scenario in that file.
If a test fails, fix it before reporting done.

## Project Info

- **Live URL:** https://karmyog-gallery.vercel.app
- **Admin PIN:** stored in Vercel env var `ADMIN_PIN`
- **Supabase:** project `pbzokljflnqovcojdhks`
- **Deploy:** `npx vercel --prod` (GitHub connected, also auto-deploys on push)
