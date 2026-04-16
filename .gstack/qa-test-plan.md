# KarmYog Gallery — QA Test Plan

Every time code changes, run ALL these scenarios against the live URL.
Add new scenarios as features are added. Never remove a passing test.

## Authentication (PIN Gate)

1. **Unauthenticated access blocked**: Go to `/review` without session → PIN screen appears
2. **Wrong PIN rejected**: Enter `000000` → "Invalid PIN" error shown
3. **Correct PIN grants access**: Enter correct PIN → review page loads with images
4. **PIN persists on refresh**: Refresh `/review` → still authenticated (no PIN screen)
5. **Lock button works**: Click Lock → session cleared → PIN screen returns
6. **Portfolio page also gated**: Go to `/portfolio` without session → PIN screen

## Image Review

7. **Stats display correctly**: Total / Pending / Approved / Rejected / Trash counts match actual data
8. **Image grid loads**: Pending images shown with thumbnails, quality badges, tags
9. **Image modal opens**: Click any image → modal with full metadata, tags, caption, colors
10. **Single approve works**: Click Approve in modal → toast "Image approved" → image moves to approved
11. **Single reject with undo**: Click Reject in modal → toast with Undo button (10 seconds)
12. **Undo restores image**: Click Undo on toast → image restored to pending
13. **Bulk select works**: Select All → checkboxes on all images → bulk action bar appears
14. **Bulk approve with confirmation**: Select multiple → Approve Selected → confirmation modal → approved
15. **Bulk reject with confirmation**: Select 5+ → Reject Selected → must type "reject" → rejected
16. **Filters work**: Status dropdown (All/Pending/Approved/Trash), quality slider, search, tag buttons

## Trash View

17. **Trash filter shows deleted images**: Select "Trash" in dropdown → soft-deleted images visible
18. **Deleted timestamp shown**: Each trashed image shows "Deleted DD/MM/YYYY" in red
19. **Restore from trash**: Select image in trash → Restore Selected → image returns to pending
20. **Trash count updates**: After reject/restore, Trash stat number updates correctly

## Portfolio List

21. **Portfolio cards display**: Title, template, prompt excerpt, image count, status badge
22. **View button opens gallery**: Click "View" → navigates to `/gallery/{id}`
23. **Edit button opens editor**: Click "Edit" → navigates to `/portfolio/{id}/edit`
24. **No "Edit" mislabel**: Buttons say "View" and "Edit" separately (NOT "Edit" for both)

## Edit Portfolio

25. **Edit page loads**: Title input, cover selector, image list with captions
26. **Title is editable**: Change title text → Save → title persists on reload
27. **Captions are editable**: Edit any caption → Save → caption persists
28. **Remove image**: Click X on an image → image removed from list
29. **Add images**: Click "+ Add Images" → picker shows approved images → click to add
30. **Cover image selector**: Click different thumbnail → cover changes
31. **Publish/Unpublish**: Click Publish → status changes to published → portfolio visible publicly
32. **Delete portfolio**: Click "Delete this portfolio" → confirmation → soft deleted
33. **Preview button**: Click Preview → opens gallery view in new tab
34. **Back link**: "← Back to Portfolios" navigates to portfolio list

## Create Portfolio Wizard

35. **Step 1 — Intent**: Prompt textarea + 5 template options + "Step 1 of 3" indicator
36. **Next disabled without prompt**: Button disabled until prompt has text
37. **Step 2 — Images**: "Let AI choose" checkbox (default on), image grid if unchecked
38. **Tag filter on images**: Tag buttons filter the image grid
39. **Step 3 — Review**: Shows prompt, template, image count summary
40. **Generate button**: Calls API, shows progress messages, creates portfolio
41. **Step 4 — Success**: Shows "Portfolio Created!" with View and Edit buttons

## Gallery View (Public)

42. **No PIN required**: Gallery page loads without authentication
43. **No admin navigation**: No Review/Portfolios links visible
44. **Back button**: "← Back to Portfolios" link at top
45. **Share bar**: Copy Link / WhatsApp / Email buttons at top
46. **Hero image**: Cover image displayed full-width
47. **Captions displayed**: Each image has its caption below
48. **Footer**: KarmYog Vatika Gardens branding + address

## Audit Trail

49. **Approve logged**: Check `audit_log` table after approve → entry exists
50. **Reject logged**: Check `audit_log` table after reject → entry exists
51. **Restore logged**: Check `audit_log` table after restore → entry exists
52. **Portfolio edit logged**: Check `audit_log` table after save → entry exists

## Console Health

53. **No JS errors on review page**: Console clean after normal usage
54. **No JS errors on portfolio page**: Console clean after normal usage
55. **No JS errors on gallery page**: Console clean on public page
