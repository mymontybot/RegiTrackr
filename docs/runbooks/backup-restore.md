# RegiTrackr Backup and Restore Runbook

## Supabase daily backup schedule

- Supabase managed backups run daily for production projects.
- Confirm retention window in Supabase project settings (depends on plan tier).
- Keep a note of backup timestamp before each major release/migration.
- For high-risk releases, create an on-demand backup/snapshot if your plan supports it.

## Restore from backup

1. Identify target restore point (timestamp + reason).
2. Put app in maintenance mode or freeze write traffic.
3. In Supabase dashboard:
   - Open project backups.
   - Select restore point.
   - Restore to a new project (preferred) or same project based on incident scope.
4. Update connection secrets (`DATABASE_URL`, `DIRECT_URL`) if restored target changes.
5. Deploy app config update in Vercel.

## Verify backup integrity

After restore, verify:

- Prisma connectivity works (`npx prisma migrate status`).
- Row counts for critical tables are plausible (`Firm`, `Client`, `Entity`, `RevenueEntry`, `FilingRecord`, `Alert`).
- Sample encrypted fields decrypt correctly in app flows.
- Core app flows work:
  - Clerk auth
  - dashboard load
  - alert list
  - filing calendar
  - portal login
- Inngest jobs can read/write successfully.

## Recovery completion checklist

- Confirm business owner sign-off on restored data.
- Re-enable writes/traffic.
- Document incident timeline and root cause.
- Schedule post-incident review and prevention actions.
