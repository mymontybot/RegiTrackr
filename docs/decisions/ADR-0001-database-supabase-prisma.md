# ADR-0001: Database Platform - Supabase + Prisma

- **Status:** Accepted
- **Date:** 2026-03-01

## Decision

RegiTrackr will use **Supabase (PostgreSQL)** as the database platform and **Prisma** as the ORM/data access layer.

## Context

RegiTrackr is a multi-tenant SaaS for CPA firms with strict tenancy isolation requirements, deterministic compliance workflows, and a need for fast iteration in a TypeScript/Next.js stack.

Supabase was chosen because it provides:
- Managed PostgreSQL with strong SQL capabilities and reliability.
- Row-Level Security (RLS) support for database-enforced tenant isolation.
- Operational simplicity for backups, connectivity, and project management.

Prisma was chosen because it provides:
- Type-safe schema and query tooling aligned with TypeScript and Next.js.
- A clear migration workflow and generated client for developer productivity.
- Predictable domain modeling for a growing compliance data model.

This combination supports both rapid development and strong data governance.

## Consequences

### Positive

- **Dual-layer tenant security:** tenancy is enforced both in the service layer and in database RLS policies (defense in depth).
- **Type-safe data access:** Prisma improves correctness and maintainability across services/routes.
- **Structured schema evolution:** migrations are explicit and versioned.

### Trade-offs / Constraints

- **RLS policy maintenance:** every tenant-owned table requires explicit RLS policies and ongoing review.
- **Connection configuration complexity:** Supabase pooler/direct URLs must be configured correctly.
- **DIRECT_URL requirement for migrations:** Prisma migrations require a direct/session-compatible connection path (`DIRECT_URL`) in addition to the pooled runtime `DATABASE_URL`.

## Notes

- Service-layer scoping remains mandatory even with RLS enabled.
- `app.current_firm_id` session context is set per request transaction before tenant-scoped queries.
