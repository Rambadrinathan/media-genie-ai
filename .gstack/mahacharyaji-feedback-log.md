# MahAcharyaJi Feedback Log — Media Genie AI

**Purpose:** every piece of product feedback MahAcharyaJi has given on Media Genie AI (originally built as KarmYog Gallery), preserved verbatim as written. This is the source of truth for what shaped the product.

**How this log is used:**
- When adding new feedback, append to the end with the full quote, date, and timestamp.
- Do not paraphrase. If the original message is long, quote it in full.
- Keep a short "Shipped as" line beneath each entry, added *after* implementation.

---

## 1. First draft review — 8-item foundational feedback

**When:** Apr 16, 2026 · 12:01 PM IST

> Ram... As a first draft, this is superb! it should be very useful provided we humans use it properly.
>
> Specific feedback to be incorporated before deployment... There are 3 pages in the app now:
> 1. Image Management (This has to be secured... Who is approving? MahAcharyaJi approved something, and some lizard flaps its tail, and things get deleted! Then what happens. So this has to be made more secure).
> 2. Portfolio Gallery (Should not have 'Review' and 'Porfolio' links in the header
> 3. View Portfolio (should have share mechanism)
> 4. Create Portfolio (Needs some fine tuning)
> 5. Edit Portfolio (This functionality is not yet built... Add / remove pics, and edit text)
>
> Other feedback:
> 1. The existing portfolios "View" button is mislabeled as "Edit"... So on clicking the "Edit" button, i am taken to the View Portfolio page.
> 2. The View Porfolio page, does not have a button/link to take me back to the main "Gallery of Portfolios"...
>
> This is the product visionary Mahacharya Ji's first feedback to the first version. Go through it one by one and synthesize it carefully. Take your time understanding it, and then you plan the second version well, based on his feedback, so that what we are giving to him is actually something that is totally world-class and which we can take to market and be production-ready.

**Shipped as v2 (Apr 16):** PIN-based AdminGate (6-digit, 24h session, Lock button) on Image Management; separate admin vs public Header components (public has no Review/Portfolio links); share bar on View Portfolio (Copy Link / WhatsApp / Email); 3-step Create Portfolio wizard with progress messages; full Edit Portfolio page (title, cover, reorder, captions, add/remove, publish/unpublish); View button relabeled correctly; Back button added everywhere.

---

## 2. Manual image-picker logic — v4 feedback

**When:** Apr 17, 2026 · 7:34 AM IST

> v4 Feedback: The one thing that is not clear is the logic behind the images that the system brings up in the pop-up window that appears, when we click the "Add Images" button from the "Edit Portfolio" page. This pop-up seems to use some internal logic or algorithm that give us the choice of pics. If AI is providing this limited choice it is fine... But if that is the case, then we should also have an option to switch to manual choice also... meaning that we should be able to select the 'folder', 'scene' and 'tag' metadata (dropdowns or checkboxes or tag-selectors) manually, and then the system can display the images that conform to that selection. And then we add them to the portfolio. Otherwise we are seriously limiting the possibility of creating portfolios manually.

**Shipped as:** manual filter controls (folder chips, scene chips, tag chips, quality slider, search) in the Add Images picker on `/portfolio/[id]/edit`. Users can now hand-select images by any combination of metadata, not just trust AI suggestions.

---

## 3. Picker scale + multi-select + character limits

**When:** Apr 17, 2026 · 8:18 AM IST

> [8:18 am, 17/04/2026] Guru: it is perfect now... However, the pop-up window loads up with all (5 of 5, in this case) approved images as a default. This is not a problem, when we have only 5 approved yet unused images in our image gallery (or database)... But as this scales, there will be thousand of images in the gallery... So it should not try to load ALL of them as a starting default. A few (15 max) of them may be there... Just to give a feel of the UI... Rest should load based on the selection of metadata on the UI... This limit may be achieved by preselecting some tags, quality and other metadata... Also in this window, it is important to be able to select multiple 'folders' and 'scenes' for generating the display option of images to choose from. Currently, 'folder' and 'scene' cho[ice is single-select]
>
> This will also require us to have fairly stringent character-limits for labelling of 'tags', 'folders', and 'scenes'

**Shipped as:** server-side filtered picker API (`/api/images/pick`) — loads 15 top-quality images by default with "Load 15 more" pagination, shows "N of M matching (K approved total)" counter. Folder and scene chips became multi-select. Character limits enforced both client-side and server-side: tags 30, folders 40, scenes 40, captions 500. `sanitizeLabel()` utility normalizes labels (lowercase, hyphens, strip special chars).

---

## 4. Folder/scene filter + bulk metadata edit on Review page

**When:** Apr 18, 2026 · 10:14 AM IST

> [10:14 am, 18/04/2026] Guru: one more feedback on MediaGenie.ai as i am using it for real:
> 1. The Image Management (Review) page: We should be able to search 'folder' and 'scene' also... In the same way that we did for the 'Add Images' pop-up in the 'Edit' Portfolio section...
> 2. When we select one or more image on this page, the batch processing now only allows 'approve selected' or 'reject selected' options... We should also have the option to change the 'Quality Score', 'folder', 'scene'

**Shipped as:** Review page now has the same three chip-filter rows (Folders, Scenes, Tags) that the Edit Portfolio picker has — multi-select, server-side filtered. Selection bar gained three new bulk buttons: **Set Quality** (slider 0-10), **Set Folder** (chip picker + add new), **Set Scene** (chip picker + add new). Backend `update_details` action extended to accept a bulk `ids[]` for one-query updates.

---

## 5. Quality operator — exactly / less than / more than

**When:** Apr 18, 2026 · 10:38 AM IST

> [10:38 am, 18/04/2026] Guru: One more fine one:
> 1. The Image Management (Review) page: the images that are displayed by default are based on "Min Quality"... Which means that all images above a specific Quality rating get displayed. So if if want to see only those images that are rated, say, 5, there is no way to get them. All the ones from 5 to 10 get displayed. So their should be an option to chose in the quality scale 'exactly', 'less than' and 'more than'... That will cover all the possibilities.
>
> [follow-up] Currently, it is either reject or approve... Reject is like Trash... But it will be useful to have them rated in the 0 to 10 scale for those that we don't want to trash.

**Shipped as:** quality filter dropdown with four operators on Review page — `at least` (default, = current behavior), `exactly`, `less than`, `more than`. Combined with the 0-10 slider, covers every possible query. Unlocks the "rate without rejecting" workflow — a 3/10 image can stay in the library, not be trashed, and still be filtered out of polished portfolios by picking "more than" with threshold 6.

---

## 6. Settings page — manage folders and scenes

**When:** Apr 18, 2026 · 10:42 AM IST

> [10:42 am, 18/04/2026] Guru: One more:
> 1. Will be good to have a 'Settings' page, where we can have things like Manage Folders and Scenes... Where we can add, edit and deleter folders and scenes

**Shipped as:** new `/settings` route, admin-protected, accessible from the main nav. Two tabs: **Folders** and **Scenes**. Each shows every label with its image count. Per row: **Rename** (sanitizes the new name, updates every image using that label in one query) and **Delete** (clears the label from all images — images themselves are untouched; requires typing "delete" if ≥5 images are affected). Backend: `PATCH /api/images/taxonomy` (rename) and `DELETE /api/images/taxonomy` (clear). Folders/scenes remain derived from the images table — there's no standalone registry — so adding new ones still happens inline from an image's Edit Details screen.

---

## Direction A redesign — first-review feedback

**When:** Apr 20, 2026 (reviewing https://media-genie-2.vercel.app)

> Feebdack on Version of Media Genie near perfect, now...
> The only clink i could find is in the 'Add Images' page that pops up from the Add Images button click on the Portfolio Editor. In this pop up window, the images that are being displayed in a scrollable section within this window... At 100% zoom, this scrollable section is vertically not providing the space for the user to actually see even on row of images fully. So vertical space provided for this scrollable section where image is being displayed is small compared to the overall pop-up window size... So either it should be a different page and not a pop up window, or the pop up window should be bigger at least in height, or the other content in that window need to be composed so that we have more space for display of the images. Also, in the Portfolio page, the thumnail pics of the portfolios did not load, on my machine.

**Shipped as:** _(pending approval — see proposed fix below)_

---

## Meta

- **Product versions this feedback produced:** v2 (security + share + edit portfolio) · v3 (browser upload + AI classification) · v4 (editable metadata + dynamic taxonomy) · v5 (server-side picker + multi-select + char limits) · v1.0.0 "Media Genie AI" production release · post-v1 polish (folder/scene filter + bulk edit + quality operator + settings) · Direction A redesign (Editorial Vatika) · Direction A review round 1.
- **Time from first draft to production-ready:** Apr 16 → Apr 18. 2 days.
- **Sessions:** all feedback verbatim from Claude Code session transcripts `c4dfc191-a5c2-47d3-90fc-5feee03be560.jsonl`, `8dee4049-2644-421b-b2ef-6fd71adf6b91.jsonl`, and the Apr 20 continuation.
