# Media Genie AI

**AI-powered image management and portfolio generator.**

Drop photos into the browser, let Claude Vision classify them automatically, review and approve, then generate beautiful shareable portfolios with a one-line prompt.

**Live:** https://media-genie-ai.vercel.app
**Repo:** https://github.com/Rambadrinathan/media-genie-ai

---

## What it does

1. **Upload** — drag-and-drop any number of images into the Review page.
2. **AI classifies each image** — Claude Vision tags them, scores quality (0-10), writes a caption, suggests a folder and scene, detects dominant colors.
3. **Review and approve** — browse by tag, scene, or quality. Approve good ones, reject bad ones (soft delete with undo).
4. **Build a portfolio** — type a prompt like "best bamboo installations for an investor pitch". AI selects images, orders them, writes captions, picks a cover.
5. **Share** — every portfolio gets a public URL with Copy Link, WhatsApp, and Email share buttons. No sign-in required for viewers.

---

## Architecture

```
Browser (Admin)                                 Browser (Public viewer)
    |                                                   |
    | PIN gate                                          | /gallery/[id]
    |                                                   |
    v                                                   v
Next.js 16 App Router (Vercel serverless)
  |
  +-- /review  (image upload, review, edit details)
  +-- /portfolio  (list, create, edit)
  +-- /gallery/[id]  (public portfolio view)
  |
  +-- /api/images/upload    --> Sharp resize --> Claude Vision --> Supabase
  +-- /api/images/pick      --> Supabase filtered query
  +-- /api/images/taxonomy  --> Supabase DISTINCT query
  +-- /api/portfolios/*     --> Supabase + Claude (for generate)
  |
  v
Supabase
  - Postgres (images, portfolios, audit_log)
  - Storage (thumbnails bucket)
  - Row Level Security (public reads approved images and published portfolios only)
```

---

## Core features

### Image upload with AI classification
- Multi-file drag-and-drop, up to 20 MB per image
- Images resized to 1500px before Claude Vision call (saves time, same classification quality)
- Per-image progress display: uploading -> classifying -> done
- Tags, quality score, caption, scene, folder, dominant colors all auto-generated

### Review workflow
- Filter by status (pending / approved / trash), quality, tags, search
- Bulk approve or reject with confirmation (type "reject" for 5+ images)
- Reject is soft delete — 10-second undo toast, Trash view with restore
- Full audit trail of every action

### Editable image details
- Edit tags, caption, quality score, scene, folder per image
- Add new custom folders or scenes inline (self-learning taxonomy)
- Multi-level hierarchy: folder (category) + scene (context)
- Character-limited labels: tags 30, folders 40, scenes 40

### Portfolio builder
- 3-step wizard: intent -> images -> review
- AI can choose images automatically, or you pick manually
- Templates: Investor Pitch, Project Gallery, Social Grid, Before-After, Custom

### Portfolio editor
- Inline title editing, caption editing per image
- Add/remove images via filtered picker with multi-select chips
- Drag to reorder, change cover image
- Publish / Unpublish / Delete

### Image Picker (scale-ready)
- Server-side filtering — does not load entire library into the browser
- Multi-select filters: folders (chips), scenes (chips), tags (chips), quality slider, search
- Loads 15 top-quality images by default, "Load 15 more" for pagination
- "Showing N of M matching (K approved total)" counter

### Public gallery
- Hero image + alternating grid layout
- Back to Portfolios + Share bar (Copy Link / WhatsApp / Email)
- No authentication required — public RLS policy on published portfolios

### Admin security
- PIN-based access gate (6-digit, env var `ADMIN_PIN`)
- 24h localStorage session, manual Lock button
- All mutations logged to `audit_log` table

---

## Getting started (local development)

### Prerequisites
- Node.js 20+
- A Supabase project (free tier works)
- An Anthropic API key

### Setup

```bash
git clone https://github.com/Rambadrinathan/media-genie-ai.git
cd media-genie-ai
npm install
```

### Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
ADMIN_PIN=123456

# Optional: for the CLI Google Drive ingestion script only
GDRIVE_INBOX_PATH=/path/to/Google Drive/KarmYog Images/_inbox
GDRIVE_BASE_PATH=/path/to/Google Drive/KarmYog Images

# App URL (used in generated shareable links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database setup

Run the schema and the v2 migration in the Supabase SQL editor:

```sql
-- 1. Core schema
\i scripts/schema.sql

-- 2. v2 migration (soft delete + RLS hardening)
\i scripts/migration-v2.sql
```

Create a Supabase Storage bucket named `thumbnails` (public read).

### Run

```bash
npm run dev
```

Open http://localhost:3000 — you'll hit the PIN gate. Enter your `ADMIN_PIN`.

---

## Deployment (Vercel)

1. Push the repo to GitHub
2. Import into Vercel, connect the repo
3. Add all the env vars above in the Vercel project settings (Production + Preview)
4. Deploy. Every push to `main` auto-deploys.

**To change the PIN on the live site:**
1. Update `ADMIN_PIN` in Vercel env vars
2. Trigger a redeploy (env vars only take effect on build): `npx vercel --prod` or push a commit

---

## Data model

### `images` table
Stores each ingested image. Key fields:
- `id` (UUID) | `filename` | `uploaded_at` | `processed_at`
- `width`, `height`, `mime`, `file_size`, `exif`
- `quality_score` (0-10), `tags` (text[]), `scene`, `classified_folder`, `ai_caption`, `dominant_colors`
- `status` — `pending_approval` | `approved` | `rejected` | `archived`
- `reviewed_by`, `reviewed_at`
- `thumbnail_url` (400px), `cdn_url` (800px) — Supabase Storage URLs
- `deleted_at`, `deleted_by` — soft delete

### `portfolios` table
- `id`, `title`, `template`, `prompt`
- `image_ids` (uuid[]) — ordered
- `captions` (jsonb) — `{imageId: "text"}`
- `cover_image_id`, `published_url`
- `status` — `draft` | `published` | `archived`
- `deleted_at`, `updated_at`

### `audit_log` table
- Every mutation logs: `user_id`, `action`, `target_type`, `target_id`, `details` (jsonb), `created_at`

### RLS policies
- Service role: full access (backend only)
- Anonymous users: read-only access to `status = 'approved' AND deleted_at IS NULL` images and `status = 'published' AND deleted_at IS NULL` portfolios

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16.2.3 (App Router, Turbopack) |
| UI | React 19.2.4, Tailwind CSS 4 |
| Database + Storage | Supabase (Postgres + Storage + RLS) |
| AI | Claude Sonnet 4 via `@anthropic-ai/sdk` |
| Image processing | Sharp (resize, thumbnails), exifr (EXIF) |
| Hosting | Vercel (serverless functions) |

---

## Optional: CLI bulk ingestion

For bulk imports from a local Google Drive folder (desktop sync), the original CLI pipeline still works:

```bash
# One-time scan
npx tsx scripts/process-inbox.ts

# Watch mode (monitors Google Drive inbox folder continuously)
npx tsx scripts/process-inbox.ts --watch
```

Set `GDRIVE_INBOX_PATH` and `GDRIVE_BASE_PATH` in `.env.local` first.

---

## License

MIT. See [LICENSE](./LICENSE).

---

## Credits

Built by Ram Badrinathan with Claude Code.
Original prototype: KarmYog Gallery (v0.x) for KarmYog Vatika Gardens — the first customer.
