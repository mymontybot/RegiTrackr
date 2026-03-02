# RegiTrackr Deployment Runbook

## Pre-deploy checklist

- Confirm `main` is green: `npm run lint`, `npm run build`, `npx vitest run`.
- Confirm Vercel project has all required env vars for target environment.
- Confirm database connectivity with `DATABASE_URL` and `DIRECT_URL`.
- Review pending Prisma migrations in `prisma/migrations`.
- Verify seed/reference data status for target environment.
  - Staging: apply reference seed data if needed.
  - Production: do not run dev fixtures.
- Confirm webhook endpoints/secrets are configured for Clerk and Stripe.
- Confirm Inngest keys (`INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`) are set.
- Confirm Sentry DSN is set.

## Deploy flow

1. Merge PR to deploy branch (typically `main`).
2. Wait for Vercel build to start.
3. If migration is required, run migration first (see below) before promoting traffic.
4. Monitor Vercel build logs for:
   - Prisma client generation success
   - Next.js build success
   - no missing env var warnings
5. Promote deployment when smoke tests pass.

## Running migrations against staging DB

Use `prisma migrate deploy` only.

```bash
# Run from repo root with staging env values loaded.
DATABASE_URL="<staging_runtime_url>" \
DIRECT_URL="<staging_direct_url>" \
npx prisma migrate deploy
```

Then verify:

```bash
npx prisma migrate status
```

## Vercel dashboard env setup

In Vercel Project Settings -> Environment Variables, set all required keys:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `ANTHROPIC_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `INNGEST_SIGNING_KEY`
- `INNGEST_EVENT_KEY`
- `RESEND_API_KEY`
- `SENTRY_DSN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `ENCRYPTION_KEY`
- `PORTAL_JWT_SECRET`
- `NEXT_PUBLIC_APP_URL`

Set values separately for Preview, Staging (if used), and Production.

## Post-deploy smoke tests

- Open `/dashboard` as firm admin.
- Open `/dashboard/alerts` and `/dashboard/calendar`.
- Trigger one narrative generation and confirm no API error.
- Trigger one Inngest event (`regitrackr/nexus.recalculate`) and verify job logs.
- Verify Clerk sign-in and sign-up pages.
- Verify Stripe billing settings page and portal redirect.
- Verify portal login path `/portal/[firmSlug]/login`.
- Verify one CSV template download and one small CSV import.
- Verify Sentry receives a test event/error from environment.

## Rollback procedure

1. In Vercel, rollback to previous healthy deployment.
2. If migration already applied and needs logical rollback:
   - Deploy app code compatible with current DB schema first.
3. If migration metadata needs manual correction:

```bash
npx prisma migrate resolve --rolled-back "<migration_id>"
```

4. If corrective migration is required, create a new forward migration and deploy it.
5. Re-run smoke tests on rolled-back deployment.
