# Project conventions

- Use Bootstrap for the React interface, with journal-specific CSS where needed.
- Keep each page in its own file; do not combine multiple page implementations in an entry point.
- Group each admin form in its own folder under `src/pages/admin/<form>/`.
- Keep list, add, and edit pages separate within that form folder. Put reusable form-specific components and styling in the same folder.
- Use separate add and edit routes rather than add/edit dialogs. Discipline uses `/portal/admin/discipline`, `/portal/admin/discipline/add`, and `/portal/admin/discipline/edit?id=<id>`.
- Keep general admin components such as the layout and confirmation dialog under `src/components/admin/`.
- This application serves a single journal. Do not show Add Discipline buttons in the dashboard, discipline list, or empty state. Confirm discipline deletion with a warning that the journal will no longer have discipline details; clear its reference when deletion is confirmed.
- The Discipline list's Delete button is currently disabled at the user's request.
- Author affiliation search uses a checkbox popup for multiple selections. Exactly one selected affiliation is Primary; only the primary institution is displayed outside the popup and in author listings. Preserve all selected affiliations and their departments when saving.
- Journal management is edit-only for the existing single journal. Do not add Journal creation or deletion controls/routes. Keep its overview and edit pages in `src/pages/admin/journal/`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
