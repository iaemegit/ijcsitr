# Next.js and Prisma migration

The app uses React 19, Next.js 16, TypeScript/TSX, Node.js, MySQL through Prisma 7, Bootstrap 5.3, and Turbopack. Search runs directly in MySQL. No Python or separate search service is required.

## Structure

- `app/`: Next.js App Router pages and layouts. Each URL has its own `page.tsx`.
- `src/pages/`: existing page implementations, converted to TSX. Each admin form keeps its own folder with separate list/add/edit files.
- `pages/api/[...path].ts`: Next.js Node REST API entry point. This root `pages/` directory contains only the API; Next.js therefore does not treat the existing `src/pages/` implementation files as Pages Router routes.
- `server/`: TypeScript REST handlers. Existing Express middleware is hosted inside Next.js to preserve authentication, CSRF, request limits, multipart uploads, and error handling. There is no separate production Express listener.
- `src/lib/navigation.tsx`: Next.js links and navigation, including active menu state and save notices. React Router is removed.
- `src/lib/prisma.ts`: shared Prisma client with the MySQL/MariaDB adapter. The connection collation matches the existing `utf8mb4_0900_ai_ci` database.
- `prisma/schema.prisma`: all 16 existing models, including `author_affiliation`, introspected from MySQL. Prisma Client is generated into the ignored `src/generated/prisma/` folder.
- `server/db.ts`: Prisma queries and interactive transactions for legacy SQL relationships and search. Parameters remain bound separately from SQL. Insert IDs are read on the same connection; success responses for transactional writes are deferred until commit. Native Prisma model queries are used for journal selection and affiliation records.
- `server/test-server.ts`: isolated test harness only, serving Next.js pages with temporary test accounts and fixtures.

## Run

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://localhost:4000. Development uses Turbopack. For production:

```powershell
npm.cmd run build
npm.cmd start
```

Both frontend and REST endpoints use port 4000. The previous Vite port 5173 is no longer used.

## Database preservation

The conversion reads the existing schema with `prisma db pull`; it does not recreate tables, reset MySQL, or replace credentials. Existing `MYSQL_*` settings remain in `.env`. Prisma CLI derives its connection URL from those settings. `npm.cmd run db:introspect` refreshes the schema after an intentional database change; `npm.cmd run db:generate` regenerates the client. No database migrations are applied automatically at install, build, or startup.

Original source files were copied to the ignored `.local/migration-backup/` folder before conversion. Existing journals, issues, articles, authors, affiliations, administrator passwords, and upload locations are retained.

## Behavior preserved

- Single journal: Journal is edit-only. Discipline has no Add buttons and its Delete button remains disabled.
- Admin menu starts with Discipline, Journal, Journal Issue, followed by Affiliation and Author.
- Separate add/edit pages and existing URLs are retained.
- Author affiliation popup supports multiple selections, exactly one Primary, and departments per affiliation. Only the primary affiliation appears outside the popup/list.
- Journal has rich-text editors and cover image uploads. Manuscript files remain private.
- Issue duplicate checks and protection for issues containing articles are preserved.
- Admin authentication uses HttpOnly, SameSite cookies, password hashing and CSRF tokens. Sessions are held in the Node process, so a server restart requires login again. Multiple replicas would require a shared session store.

## Validation

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:integration
npm.cmd run test:browser
npm.cmd run test:admin
npm.cmd run test:affiliation
npm.cmd run test:author
npm.cmd run test:journal
npm.cmd run test:journal-issue
```

Browser checks require Chrome. Admin checks use the existing MySQL migration login profile to create temporary records and remove them afterward. They leave the real journal and administrator credentials unchanged. Identity counters advance when temporary records are inserted.
