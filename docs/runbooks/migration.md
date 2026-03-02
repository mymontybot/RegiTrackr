# RegiTrackr Migration Runbook

## DATABASE_URL vs DIRECT_URL

- `DATABASE_URL`: application runtime connection.
  - Use Supabase transaction pooler (recommended port `6543`) with pgbouncer params.
  - Used by Next.js runtime and Prisma client in app code.
- `DIRECT_URL`: migration/admin connection.
  - Use direct or session-capable endpoint (typically `5432`) with SSL.
  - Used by Prisma migration commands that require direct DDL operations.

## Safe migration policy

- Use `npx prisma migrate deploy` for staging and production.
- Never use `npx prisma migrate dev` in staging/production.
- Keep migrations forward-only and idempotent at deployment level.
- Apply migrations before traffic cutover if schema change is required.

## Apply migrations safely

1. Validate migration files in PR.
2. Backup database (or verify recent backup) before applying.
3. Run:

```bash
DATABASE_URL="<runtime_url>" \
DIRECT_URL="<direct_url>" \
npx prisma migrate deploy
```

4. Verify:

```bash
npx prisma migrate status
```

5. Run application smoke tests.

## Roll back a migration

Prisma does not do destructive rollback automatically in production.
Preferred strategy:

1. Roll back app deployment in Vercel if needed.
2. Create and apply a new corrective forward migration.
3. Use `prisma migrate resolve` only to fix migration history state when needed.

Example:

```bash
npx prisma migrate resolve --rolled-back "<migration_id>"
```

Then add and deploy a corrective migration.

## If migration fails mid-way

1. Stop and capture error output.
2. Check migration status:

```bash
npx prisma migrate status
```

3. Inspect partially applied schema changes in Supabase SQL editor.
4. Decide path:
   - If no app impact yet: fix SQL/migration and redeploy.
   - If app is impacted: rollback Vercel deployment first.
5. Mark migration state appropriately with `prisma migrate resolve` (`--applied` or `--rolled-back`) only after confirming real DB state.
6. Create a corrective migration and re-run `prisma migrate deploy`.
