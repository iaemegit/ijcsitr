# PostgreSQL to MySQL migration

Source: `ijcsitr.dump`, PostgreSQL 16 custom archive.
Target: MySQL 8.4, existing empty database `ijcsitr`.

`ijcsitr-mysql.sql` contains all 15 table definitions and 668 rows. It does not drop existing tables. Do not import it into a database that already contains tables.

Conversion preserves column names, nullability, primary keys, explicit IDs, and the next generated IDs. PostgreSQL timestamps without time zones become `DATETIME(6)`. PostgreSQL text and varchar fields longer than 255 characters become `LONGTEXT` to avoid MySQL row size limits. Smaller varchar lengths are retained. Text uses utf8mb4. No additional foreign keys or indexes are introduced. MySQL's selected collation is utf8mb4_0900_ai_ci; text comparisons can differ from PostgreSQL's source locale.

SQL values use UTF-8 hex literals to preserve quotes, backslashes, tabs, newlines, and HTML without SQL escaping ambiguity. The conversion validates COPY field counts and duplicate primary keys. The original dump is unchanged.

## Import and verify

Save a login profile in your own PowerShell window; the password is entered at the prompt, not in the command:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql_config_editor.exe" set --login-path=ijcsitr-migration --host=localhost --user=root --password
```

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File D:\reactapp\ijcsitr\old-db\import-and-verify.ps1
```

The script refuses to import if `ijcsitr` already contains tables. It imports with strict SQL mode, then compares every stored value with the decoded source, accepting timestamp formatting and floating-point text normalization. Success writes `migration-validation.json` with row counts and verified cell counts. Errors stop execution; MySQL DDL is not transactional, so a failed import can leave partial tables. Do not rerun against partial tables without reviewing the failure.

Artifacts containing the source data (`postgresql-extracted.sql`, `ijcsitr-mysql.sql`, `migration-expected.xml`) include personal information and existing users' password values. Treat them like the original backup.

The portable `pg_restore` tool was downloaded from EDB's PostgreSQL binaries distribution; no PostgreSQL service was installed.

## Completed validation

Imported into the local `ijcsitr` MySQL database on 2026-10-20. All 15 tables, 668 rows, and 15,392 field values passed comparison with the decoded source. See `migration-validation.json`. Recheck existing imported data without importing again with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File D:\reactapp\ijcsitr\old-db\import-and-verify.ps1 -VerifyOnly
```
