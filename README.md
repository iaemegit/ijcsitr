# IJCSITR

Single-journal publishing application using **React + Next.js + TypeScript/TSX + Node.js + MySQL + Prisma + Bootstrap 5.3 + Turbopack + REST APIs**.

```powershell
cd D:\reactapp\ijcsitr
npm.cmd ci
npm.cmd run dev
```

Open **http://localhost:4000**. Frontend and REST APIs share one Next.js server. For production, run `npm.cmd run build`, then `npm.cmd start`. Stop an existing process on port 4000 before starting a new one.

The ignored `.env` contains the existing `MYSQL_*` credentials. Prisma uses the existing MySQL tables; builds and startup do not change the schema. The application does not use root credentials. MySQL search requires no separate search service or indexing step.

Legacy imports may contain an author's institution only in `author.university`, without relationship IDs. Run `npm.cmd run db:repair-author-affiliations` to preview a repair report in `.local/author-affiliation-repair.json`. Add `-- --apply` to save uniquely matching institution name/address/country relationships in both the primary reference and selected-affiliations table. Existing selections are preserved; ambiguous duplicates or missing information are left for manual review. The repair preserves author details, departments, and article references.

See [MIGRATION-NEXT.md](MIGRATION-NEXT.md) for the new structure, database preservation, deployment limits, and test commands.

## Features

- Public reviewer registration at `/joinreviewer` saves pending applications into the existing Join Us admin inbox. It uses local country options, active database disciplines, required qualifications/contact details and validated PDF/DOC/DOCX CVs (10 MB maximum). CVs live in `uploads/reviewer-applications/` and are accessible only through authenticated record-specific admin attachment routes. `scripts/enable-public-reviewer-applications.sql` grants INSERT access only to the application fields. Run `npm.cmd run test:reviewer-application` to verify validation, registration, inbox visibility, CV privacy and mobile layout with temporary records.

The public pages share the supplied research/publications template style through `src/pages/home/research-template.css`, with independent TSX pages and a shared header/footer in `PublicShell`. Reference HTML scripts, tracking and cookie widgets are not imported. The saved reference images were empty; replacement local photographs are in `public/images/`: [Earth at night](https://images.unsplash.com/photo-1451187580459-43490279c0fa) and the [publishing feature](https://images.unsplash.com/photo-1516321318423-f06f85e504b3).

- Public journal overview, article library, search/filter/sort/pagination, article details and BibTeX export.
- Additional admin sections: `/portal/admin/join-us`, `/portal/admin/online-papers`, `/portal/admin/downloads`, `/portal/admin/testimonial`, and `/portal/admin/contact-us`. Join Us, Online Papers and Contact Us review existing submissions; Downloads and Testimonial have separate add/edit pages. Each form has its own folder under `src/pages/admin/`; general components live under `src/components/admin/`. CV/manuscript PDFs and images use authenticated file routes. Existing manuscript UUID filenames remain accessible through record-specific admin routes. Downloads/Testimonial tables are added with `scripts/setup-admin-content-tables.sql`; apply the separate permissions script only after approval. Run `npm.cmd run test:admin-content -- --read-only` before permissions are enabled.
- Call for Papers admin pages use `/portal/admin/call-for-paper`, `/portal/admin/call-for-paper/add` and `/portal/admin/call-for-paper/edit?id=<id>`. They provide issue/dispatch month and year, deadline/date validation, status, search, pagination, authenticated PDF uploads (10 MB) and confirmed deletion. Files are stored in `uploads/call-for-papers/`. Enable writes with `scripts/setup-call-for-paper-admin.sql` after explicit approval. Run `npm.cmd run test:call-for-paper -- --read-only` before granting permissions; omit the flag for full CRUD checks afterward.
- The Awards dashboard has row checkboxes, audit columns, CSV/PDF downloads and print output. Exports include every matching award across pages, or only checked rows when selected. Selection clears on search/page changes. Select one row to show Edit/Delete; recipient names also open the separate edit page. CSV output neutralizes spreadsheet formulas.
- Awards administration at `/portal/admin/awards` includes search, pagination, status filters, separate add/edit pages, award descriptions, academic profiles, profile photo uploads and confirmed deletion. Files live under `src/pages/admin/awards/`; validated photos are stored in `uploads/awards/`. Content uses the existing 255-character database limit. Enable writes through the explicitly approved `scripts/setup-awards-admin.sql`; use `npm.cmd run test:awards -- --read-only` before granting permissions, or omit the flag afterward for full CRUD checks.
- Membership administration uses `/portal/admin/membership`, `/portal/admin/membership/add` and `/portal/admin/membership/edit?id=<id>`. It includes search, pagination, status filters, academic profiles, validated photo uploads and delete confirmation. Pages live separately under `src/pages/admin/membership/`. Apply `scripts/setup-membership-admin.sql` after explicit approval to enable writes. Run `npm.cmd run test:membership -- --read-only` for checks before granting permissions, or omit the flag for full CRUD checks afterward.
- Editorial Board forms use a two-column layout, a single-journal selector and a Profile Photo upload (JPG/PNG/WebP, maximum 5 MB). Photos are validated, converted to WebP and stored under `uploads/editorial-board/`; existing member keys and status values are preserved when editing.
- Editorial Board admin pages at `/portal/admin/editorial-board`, `/portal/admin/editorial-board/add` and `/portal/admin/editorial-board/edit?id=<id>` support search, pagination, member roles, affiliations, profile URLs, status and confirmed deletion. Email remains private; active members appear on the public board. Enable writes using the separately approved `scripts/setup-editorial-board-admin.sql`. Check with `npm.cmd run test:editorial-board` or add `-- --read-only` before granting writes.
- Issue archives, editorial board, persistent local reading list, contact form and private PDF manuscript submissions.
- Admin login and dashboard; Discipline, Journal, Journal Issue, Affiliation, Author and Article management.
- Article search and pagination, separate add/edit pages, ordered authors and corresponding author, journal issue selection, publication dates and metadata. PDF upload is required before saving; Word (.doc/.docx) upload is optional. Each file has its own Choose File and Upload controls (maximum 10 MB). Successful uploads lock that chooser until Delete is clicked. Drafts remain private; published articles appear in the public library. Deletion requires confirmation.
- The Article form uses two columns, dependent Volume/Issue selectors that fill months and year, rich-text Abstract and Reference editors, a Search Authors popup, and a selected-authors table with a single corresponding-author choice.
- Journal is edit-only; Discipline has no Add buttons and its Delete button is disabled.
- Author affiliation checkbox popup, multiple institutions, one Primary, departments per institution.
- Rich-text journal descriptions and cover uploads with image validation and conversion to WebP.
- Issue duplicate validation and protection against deleting issues containing articles or changing their identifiers.
- Journal Issue listings show row selection, serial/volume/issue numbers, publication months/year, special issue, created/updated user IDs and dates, and status. Listings use six rows per page in chronological order and retain Edit/Delete actions.
- Linked affiliations show View links instead of Delete. The warning popup lists author IDs, names and related article IDs, including primary and secondary affiliations. Linked records are also protected from deletion by the REST API.
- Affiliation name and Address are optional. Country is required and selected from an alphabetical list of countries and territories; existing country values are preserved when editing. Country-only entries can be selected for authors and display as “India (country only)”, for example, while the institution name stays blank in MySQL.
- Affiliation forms hide Papers published and preserve its existing value when editing. Upload Logo accepts JPG, PNG and WebP up to 5 MB, validates and converts images to WebP, and stores them under `uploads/affiliation-logos/` with authenticated admin previews.
- Bootstrap responsive pages, validation, confirmation dialogs, CSRF protection, password hashing, rate limits and audit fields.

## Admin routes

| Form          | List                          | Add                               | Edit                                       |
| ------------- | ----------------------------- | --------------------------------- | ------------------------------------------ |
| Discipline    | `/portal/admin/discipline`    | Hidden from UI                    | `/portal/admin/discipline/edit?id=<id>`    |
| Journal       | `/portal/admin/journal`       | Not supported                     | `/portal/admin/journal/edit`               |
| Journal Issue | `/portal/admin/journal-issue` | `/portal/admin/journal-issue/add` | `/portal/admin/journal-issue/edit?id=<id>` |
| Affiliation   | `/portal/admin/affiliation`   | `/portal/admin/affiliation/add`   | `/portal/admin/affiliation/edit?id=<id>`   |
| Author        | `/portal/admin/author`        | `/portal/admin/author/add`        | `/portal/admin/author/edit?id=<id>`        |
| Article       | `/portal/admin/article`       | `/portal/admin/article/add`       | `/portal/admin/article/edit?id=<id>`       |

Login: `/portal/admin/login`. Dashboard: `/portal/admin/dashboard`. Each form keeps separate TSX page files under `src/pages/admin/<form>/`.

Use `npm.cmd run admin:password` for the interactive password reset. For a fresh installation, restore the MySQL database using `old-db/MIGRATION.md`, configure the saved MySQL migration login profile, run `npm.cmd run db:setup` and `npm.cmd run admin:setup`, then `npm.cmd run db:introspect` and `npm.cmd run db:generate`. Database setup refuses to overwrite existing credentials.

Image/document fields in Affiliation and Author store URLs or paths. Add Journal Issue supports an optional PDF (up to 10 MB) and JPG/PNG cover (up to 5 MB), with a journal selector, publication month/year dropdowns, special issue title when needed, and a Table of Contents filename/path field. Issue uploads are stored under `uploads/journal-issues/` and available through authenticated admin file URLs; image uploads are validated and converted to WebP. Journal's Cover Image and public manuscript submissions also support uploads. Private manuscripts are never served by a public uploads directory.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:integration
npm.cmd run test:browser
npm.cmd run test:admin
npm.cmd run test:affiliation
npm.cmd run test:author
npm.cmd run test:journal
npm.cmd run test:journal-issue
npm.cmd run test:article
```

Public integration/browser checks use the running app. Admin browser checks start isolated servers and temporary records, then clean up. Chrome and the saved migration login profile are required. See the migration guide for details.

Article management permissions are defined separately in `scripts/setup-article-admin.sql`. Apply this script with the migration MySQL account to enable article creation, metadata updates and deletion. Uploaded article PDFs (maximum 10 MB) are stored in `uploads/articles/` with `<article-key>.pdf` filenames inside revision folders; draft PDFs require an authenticated admin session. Word attachments are stored separately in `uploads/articles/word_files/` and require authenticated admin downloads. The Copyright field is hidden; the server sets its value from the year of Publication Date on each save. `npm.cmd run test:article -- --read-only` checks the interface without creating articles.

The additive document migration is `scripts/upgrade-article-documents.sql` (run once). It adds `article_pdf_storage` for the physical PDF reference and `article_word_file` for private Word attachments, with UPDATE access for these two fields. New/local PDF links saved in `article_file` use `/index.php/home/article/view/<article_key>/<article_key>.pdf`; that route serves published articles only. Existing UUID links remain supported. Word files use authenticated admin downloads. Uploads are staged for the current admin until the article is saved; pending uploads expire after 24 hours or a server restart and must then be uploaded again. Run `npm.cmd run test:article-documents` to verify upload buttons, required PDF, chooser locking, persistence, public/draft access, private Word downloads and removal using a temporary article; original articles are preserved.
