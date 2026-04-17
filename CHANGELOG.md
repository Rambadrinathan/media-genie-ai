# Changelog

All notable changes to Media Genie AI are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-04-17

First production release. Rebranded from "KarmYog Gallery" to **Media Genie AI**.

### Added
- **Browser-based upload** — drag-and-drop multi-file upload with AI classification (20 MB max per image, JPEG/PNG/WebP/GIF). Images get auto-resized to 1500px before classification to reduce API latency.
- **Image Review workflow** — approve, reject, restore, bulk actions with confirmation modals. Reject is soft-delete with a 10-second undo toast.
- **Editable image metadata** — tags, caption, quality score, scene, folder all editable from the image detail modal.
- **Dynamic taxonomy** — folders and scenes are self-learning. Add custom values inline; they appear in future dropdowns automatically. Two-level hierarchy: folder (category) + scene (context).
- **Scale-ready Image Picker** — server-side filtering on the Edit Portfolio page. Multi-select chips for folders, scenes, and tags. Loads 15 by default, paginates. Shows total matching vs total approved count.
- **Portfolio Edit page** — inline title editing, cover image selector, drag-to-reorder images, add/remove, caption editing, publish/unpublish, delete.
- **Create Portfolio wizard** — 3-step flow (intent → images → review) with progress messages during AI generation.
- **Public Gallery view** — hero image, alternating grid layout, back button, share bar (Copy Link / WhatsApp / Email).
- **PIN-based admin gate** — 6-digit PIN with 24h localStorage session. Lock button to end session early.
- **Audit trail** — every approve/reject/restore/upload/edit logged to `audit_log` table with who/when/what.
- **Character limits** — tags 30 chars, folders 40 chars, scenes 40 chars, captions 500 chars. Sanitized client-side and server-side.
- **Soft delete** — rejected images go to Trash view, can be restored. Thumbnails stay in storage.
- **Google Drive CLI ingestion** — `scripts/process-inbox.ts` still works for batch imports from Google Drive folders.

### Tech Stack
- Next.js 16.2.3 (App Router, Turbopack)
- React 19.2.4
- Supabase (Postgres + Storage + RLS)
- Claude Sonnet 4 (Vision API for classification, prompt-driven portfolio curation)
- Sharp (image resize, thumbnail generation)
- Tailwind CSS 4
- Vercel (hosting)

### Database Migrations
- Initial schema: `scripts/schema.sql` (images, portfolios, audit_log tables with RLS)
- v2 migration: `scripts/migration-v2.sql` (soft delete columns, updated RLS)

### Known Limitations
- Drag-to-reorder on Edit Portfolio is implemented but not verified in headless browser testing.
- Google Drive sync requires running the CLI script on a local machine with Drive folder access. A UI-driven Google Drive OAuth integration is planned for v1.1.
- Single-tenant: all portfolios share one KarmYog Vatika Gardens gallery footer. Multi-tenant config is planned for v2.

## [Pre-release]

### 2026-04-14 — KarmYog Gallery MVP
- Initial build: image classification pipeline, Supabase storage, Review page, Portfolio generator.
- Original product name "KarmYog Gallery" used during first customer deployment.
