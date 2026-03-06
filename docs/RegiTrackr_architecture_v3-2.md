# RegiTrackr — Production Architecture v2
**Compliance tracking + synthesis for multi-state tax filing obligations**  
Status: MVP v6 (+ AI-Assisted Threshold Monitoring System)  
Audience: Founder + Engineering + Cursor Agents  
Last updated: March 2026 (v6)

---

## CHANGE LOG (v1 → v2)

| Section | What changed |
|---------|-------------|
| Section 3 Stack | Added Redis (Upstash), updated Billing to per-client metered |
| Section 4 Domain Model | Added NarrativeHistory, PublicHoliday, billing fields on Firm, removed SsoProvider |
| Section 5.2 Deadline Engine | Holiday calendars moved from V2 → MVP required |
| Section 6 AI Narrative | Word count 120 → 150–250; deadlines window 14 → 60 days; Redis cache added; POST API (no SSE); plan gate → aiNarrativeEnabled flag |
| Section 7 Billing | New section — per-client metered pricing replaces flat plan tiers |
| Section 8 New MVP Features | New section — PDF export, Nexus Trigger Date, Staff Workload |
| Section 14 Done-When | Updated to match v4 build plan |
| v4 → v5 | AI Narrative ungated (standard all tiers); aiNarrativeEnabled removed from Firm; reconcileClientCount added; dev fixture seed; onboarding runbook; PDF rate limit; unassigned client counter |
| v5 → v6 | Added Section 9.5 (Threshold Monitoring System): ThresholdChangeFlag model, AI-assisted weekly scraping job, admin review UI, customer-facing trust signals (verified badges + flag-an-error), 2 new API endpoints, 1 new Inngest job, updated Done-When checklist |

**Rule: This document supersedes v1. When in conflict with older agent SOUL/MEMORY files, this document wins.**

---

## 1) Goals

RegiTrackr's purpose is to help CPA firms and multi-entity businesses **know where they must file, when deadlines occur, and what is at risk**, without being a tax calculation engine.

Primary goals:
- Track **entities** and **clients** (for CPA firms) across states/jurisdictions
- Track **registration status** per entity/state and **filing frequency**
- Generate **deadlines** deterministically (calendar + list view)
- Track **revenue entries** and compute **nexus exposure** by state
- Provide the MVP differentiator: **Nexus Exposure Narrative** (AI synthesis paragraph, Pro tier)
- Provide **per-client metered billing** via Stripe with auto-tier promotion
- Provide **PDF Risk Score Card** export for client meetings
- Provide **Nexus Trigger Date** lookup for audit defense
- Provide **Staff Workload View** for firm admin capacity planning
- Provide **AI-assisted threshold database monitoring** with weekly scraping and human-verified updates
- Secure multi-tenant platform for CPA firms (tenant isolation is sacred)

Non-goals (MVP):
- Tax calculation, rate lookup, or tax remittance/payment processing
- Automated filing submission
- Replacing Avalara/TaxJar/Vertex/Anrok/Numeral engines
- Legal or tax advice in product or AI output
- Client portal SSO (Google/Microsoft OAuth — V2)
- SVG interactive US state map in portal (V2)
- Per-firm timezone-aware digest scheduling (V2)
- Snooze audit trail history table (V2)

---

## 2) Tenancy Model

RegiTrackr is a multi-tenant SaaS.

- **Tenant** = `Firm` (CPA firm or business)
- A firm contains `Users` and `Clients`
- A client contains one or more `Entities`
- Entities have per-state registration and filing obligations

Hard invariants:
- Every row that is tenant-owned must be scoped by `firm_id` (directly or via enforced FK path)
- No cross-firm visibility is possible by design:
  - Query scoping at service layer (enforced by BaseService.assertFirmScope)
  - RLS enforcement at database layer (Supabase — defense in depth)
- `firm_id` is NEVER accepted from request body or query params — always from session via `getTenantContext()`

Roles (CPA staff — Clerk auth):
- `FIRM_ADMIN` — full access, billing, staff management
- `STAFF_ACCOUNTANT` — client work, filing updates
- `READ_ONLY` — view only, no writes

Roles (Portal — custom JWT auth):
- `PORTAL_USER` — scoped to their assigned `client_id` only
- Portal auth is completely separate from Clerk

---

## 3) Architecture Summary

**MVP Stack (locked):**

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 14 App Router + TypeScript | App Router only — no Pages Router |
| Styling | Tailwind + shadcn/ui | Slate base color, CSS variables |
| Database | Supabase (Postgres + RLS) | Connection pooling via DIRECT_URL |
| ORM | Prisma | Singleton client pattern |
| Auth — Staff | Clerk | Webhooks create Firm + User on signup |
| Auth — Portal | Custom JWT (httpOnly cookie) | Email + password only — no OAuth in MVP |
| Background Jobs | Inngest | All jobs idempotent, 3-retry backoff |
| Cache | Upstash Redis | Narrative cache (24h TTL) + rate limiting |
| AI | Anthropic Claude API | Standard POST — no SSE streaming |
| PDF Export | @react-pdf/renderer | Server-side render, streamed to client |
| Email | Resend | Reminders, digests, portal notifications |
| Error Tracking | Sentry | Structured logs + traces |
| Billing | Stripe | Per-client metered billing + minimum floor |

---

## 4) Domain Model Overview

### Core objects (MVP)

**Tenant root:**
- `Firm` — tenant root; contains billing fields, aiNarrativeEnabled flag
- `User` — CPA staff (Clerk-backed)
- `Client` — a firm's client (increment/decrement Firm.activeClientCount)
- `Entity` — legal entity within a client (EIN encrypted at app layer)

**Reference data (not tenant-scoped):**
- `StateThreshold` — nexus thresholds per state, versioned, source_url required; includes dataConfidenceLevel, lastVerifiedDate, lastVerifiedBy, nextReviewDue fields
- `ThresholdChangeFlag` — flagged potential threshold changes from AI scraper or manual user reports; reviewed by admin before any update goes live
- `StateFilingRule` — filing frequency rules per state, versioned
- `PublicHoliday` — federal + state banking holidays for deadline calculation (MVP)

**Transaction data (all firm_id scoped):**
- `RevenueEntry` — per entity/state/period; source tracked (MANUAL, CSV_IMPORT, CLIENT_PORTAL)
- `NexusRegistration` — entity/state registration status; stateAccountNumber encrypted
- `FilingRecord` — generated due dates; rawDueDate + adjustedDueDate both stored
- `FilingStatusHistory` — audit trail; note required on every status change
- `Alert` — threshold band crossings + overdue filings; snooze fields (single note, MVP)

**AI tables:**
- `AiSummary` — Redis-backed cache fallback; stores inputHash, summaryText, highlights
- `NarrativeHistory` — 30-day audit trail for Pro/Enterprise firms only

**Portal:**
- `PortalUser` — email + passwordHash; no SSO fields in MVP
- `PortalInvitation` — token-based invite flow

### Relationship summary
```
Firm 1—N Users
Firm 1—N Clients          (activeClientCount maintained on Firm)
Client 1—N Entities
Entity 1—N RevenueEntries
Entity 1—N NexusRegistrations  (per state)
Entity 1—N FilingRecords       (per state/period)
FilingRecord 1—N FilingStatusHistory
Entity 1—N AiSummary           (narrative cache)
Entity 1—N NarrativeHistory    (30-day, Pro/Enterprise only)
```

### Key enums
- `BillingTier`: STARTER, GROWTH, PRO, ENTERPRISE
- `BillingStatus`: ACTIVE, PAST_DUE, CANCELLED
- `UserRole`: FIRM_ADMIN, STAFF_ACCOUNTANT, READ_ONLY
- `NexusBand`: SAFE, WARNING, URGENT, TRIGGERED, REGISTERED
- `FilingStatus`: UPCOMING, PREPARED, FILED, CONFIRMED, OVERDUE
- `AlertType`: WARNING_70, URGENT_90, TRIGGERED_100, TRIGGERED_NOT_REGISTERED, OVERDUE_FILING
- `RevenueSource`: MANUAL, CSV_IMPORT, CLIENT_PORTAL
- `DataConfidenceLevel`: VERIFIED, PENDING_REVIEW, FLAGGED, UNVERIFIED
- `ThresholdFlagType`: AMOUNT_CHANGE, NEW_RULE, PAGE_STRUCTURE_CHANGE, MANUAL_REPORT, SCRAPE_ERROR
- `ThresholdFlagStatus`: PENDING, REVIEWED_NO_CHANGE, UPDATED, DISMISSED

---

## 5) Deterministic Engines (No LLM)

### 5.1 Nexus Engine

**Inputs:**
- `RevenueEntry[]` (time series for entity)
- `StateThreshold[]` (reference: measurement period + thresholds)
- `NexusRegistration[]` (registration status overrides)
- `asOfDate: Date` (injectable for testing)

**Outputs per state (`NexusResult`):**
- `totalRevenue`, `revenueThreshold`, `percentOfRevenue`
- `totalTransactions`, `transactionThreshold`, `percentOfTransactions`
- `controllingPercent` — the HIGHER of revenue % vs transaction % (important)
- `band` (NexusBand)
- `isRegistered`
- `velocityData` — trailing 60-day monthly avg + estimated days to threshold
- `dataQualityFlags[]` — never infer missing data; flag it

**Alert generation (idempotent):**
- Emit at 70% (WARNING), 90% (URGENT), 100% (TRIGGERED)
- Emit TRIGGERED_NOT_REGISTERED when ≥100% with no active registration
- Dedupe key: `firmId + entityId + stateCode + alertType + band + periodKey`
  - `periodKey` = `YYYY` for CALENDAR_YEAR, `YYYY-MM` for ROLLING_12_MONTHS
- Engine RETURNS alerts as data — NexusService writes them via upsert

**Missing data rule:** Never interpolate. Flag in `dataQualityFlags`. Calculate with available data.

### 5.2 Deadline Engine

**Inputs:**
- `NexusRegistration` (filing frequency + start date)
- `StateFilingRule` (due date computation rules)
- `PublicHoliday[]` — **required in MVP** (federal + state banking holidays)
- `generateMonthsAhead: number` (default 12)
- `asOfDate: Date` (injectable for testing)

**Outputs:**
- `FilingRecord[]` schedule with both `rawDueDate` and `adjustedDueDate`
- `ReminderEvent[]` at 30/14/7/3/1 days before `adjustedDueDate`

**Holiday-aware due date adjustment algorithm:**
1. Calculate raw due date from period end + `dueDateDaysAfterPeriod`
2. If Saturday → move to Friday
3. If Sunday → move to Monday
4. If adjusted date is a federal holiday → move to next business day
5. If adjusted date is a state banking holiday (for this state) → move to next business day
6. Repeat steps 4–5 until valid business day found (max 5 iterations)

**Status workflow (invalid transitions throw):**
```
UPCOMING → PREPARED → FILED → CONFIRMED
Any       → OVERDUE  (system-set when dueDate < today, status not FILED/CONFIRMED)
OVERDUE   → FILED    (allowed — CPA marks late filing)
```
Note required on ALL status transitions.

### 5.3 Nexus History Engine (NEW — MVP)

**Purpose:** Find the exact month an entity first crossed 70%, 90%, and 100% of threshold in any state. Used for audit defense and late registration paperwork.

**Inputs:**
- `RevenueEntry[]` (all historical entries for entity/state, sorted oldest-first)
- `StateThreshold` (reference threshold for the state)

**Output (`NexusTriggerHistory`):**
- `firstWarningDate` — first period where cumulative % ≥70% (nullable)
- `firstUrgentDate` — first period where cumulative % ≥90% (nullable)
- `firstTriggeredDate` — first period where cumulative % ≥100% (nullable)
- `dataQualityNote` — present if revenue history has gaps before crossing dates

**Algorithm:** Sort entries by period ascending. For each period, compute cumulative revenue in measurement window. Record first period each band threshold is crossed.

---

## 6) MVP AI: Nexus Exposure Narrative

### Purpose
When a CPA opens a client dashboard, show a paragraph that synthesizes the compliance posture. **Included for all tiers — no plan gate.**

### API design
- **Standard POST endpoint** — `/api/narratives/[entityId]`
- **No SSE streaming** — returns full JSON response; frontend shows loading spinner
- **No tier gate** — all firms have access; rate limiting protects cost
- Response time: <100ms on Redis cache hit; <5 seconds on cache miss
- Rate limit: 10 requests per firmId per minute (Redis counter)

### Inputs (structured JSON — all sanitized before use)
- Entity name, entity type
- `nexusResults[]` — nexus proximity by state (%, totals, band)
- `velocityData[]` — optional; trailing 60-day avg for Urgent/Triggered states
- `upcomingDeadlines[]` — filtered to **next 60 days** (not 14 days)
- `overdueFilings[]`
- `dataQualityFlags[]`
- `alertsBySeverity` — count by type

### Output (Zod schema validated before caching or returning)
- `success: true`
- `summaryText` — **150–250 words** (not ≤120), 3–5 sentences
- `highlights` — exactly 3 strings
- `dataQualityFlags[]`
- `disclaimer` — exact text: *"This summary is generated from data in RegiTrackr and does not constitute tax advice. Verify all thresholds and deadlines with official state sources before taking action."*
- `generatedAt` — ISO string
- `modelId` — model used
- `cached: boolean`

Error response: `{ success: false }` — frontend hides the card entirely (never shows error state)

### Caching (two-layer)
**Layer 1 — Redis (primary, fast):**
- Key: `narrative:v1:{entityId}:{inputHash}` where inputHash = SHA256(input JSON)
- TTL: 24 hours
- Cache hit returns in <100ms without calling Anthropic

**Layer 2 — DB AiSummary (secondary, durable):**
- Written on every cache miss after successful generation
- Used by nightly cache-refresh job to pre-warm Redis

**NarrativeHistory (audit trail):**
- Written for ALL firms (no tier gate)
- `retainUntil` = now + 30 days
- Contains full input snapshot for audit purposes

### Cache invalidation triggers
Call `invalidateEntityNarratives(entityId)` when:
- A RevenueEntry is created/updated for this entity
- A FilingRecord status changes for this entity
- An Alert is triggered for this entity
- The StateThreshold database is updated (invalidates all narratives)

### Hard guardrails
- No legal/tax advice
- No data not present in input JSON — never invent state names, thresholds, deadlines
- Disclaimer always present and must match exact PRD text
- CPA-native language: direct, specific, no hedging
- Sanitize all string inputs via `sanitizeForPrompt()` before including in prompt
- Never include EIN, account numbers, firm_id, user_id, or API keys in prompts
- Validate output against Zod schema; return `{ success: false }` on mismatch

### One-sentence digest
- Separate endpoint: `POST /api/narratives/[entityId]/digest`
- Returns `highlights[0]` from cached narrative if available
- Otherwise generates a minimal single-sentence summary (cheaper prompt)
- Shown in firm-wide client list table for Pro/Enterprise firms

---

## 7) Per-Client Billing Model (NEW — replaces flat plan tiers)

### Pricing tiers

| Tier | Price per client/month | Client range | AI Narrative |
|------|----------------------|--------------|--------------|
| STARTER | $59.00 | 1–10 clients | ✓ (standard) |
| GROWTH | $45.00 | 11–50 clients | ✓ (standard) |
| PRO | $29.00 | 51–100 clients | ✓ (standard) |
| ENTERPRISE | $25.00 + $500/mo platform fee | 100+ clients | ✓ (standard) |

**Founding Member Cohort (first 25 firms — locked for life):**

| Tier | Founding Member Rate |
|------|---------------------|
| STARTER | $39.00/client/month |
| GROWTH | $29.00/client/month |
| PRO | $19.00/client/month |

Hard cap: 25 founding member firms. Rate is locked for the lifetime of the account.

**AI Narrative is included for ALL tiers.** No feature gate, no upgrade required.
Rate limiting (10 req/firmId/min) protects against cost spikes regardless of tier.

**Minimum monthly floor: $199** regardless of client count.

**Monthly charge formula:** `MAX(activeClientCount × pricePerClient, monthlyFloor)`

### Auto-tier promotion
`BillingService.promoteTier(firmId)` is called by `ClientService` whenever `activeClientCount` changes:
- 1–10 → STARTER ($59/client)
- 11–50 → GROWTH ($45/client)
- 51–100 → PRO ($29/client)
- 100+ → ENTERPRISE ($25/client + $500/mo platform fee)

Tier promotions are immediate. Tier demotions (client archival) are applied at next billing cycle.

### Firm schema billing fields
```
billingTier:          BillingTier   (STARTER/GROWTH/PRO/ENTERPRISE)
billingStatus:        BillingStatus (ACTIVE/PAST_DUE/CANCELLED)
stripeCustomerId:     String?       (unique)
stripeSubscriptionId: String?       (unique)
activeClientCount:    Int           (maintained by ClientService)
monthlyFloor:         Int           (default 199, stored in cents: 19900)
pricePerClient:       Int           (stored in cents, e.g. 5900 = $59.00)
NOTE: No aiNarrativeEnabled field — AI Narrative is standard for all tiers
```

### AI access gate
All narrative API calls check `Firm.aiNarrativeEnabled` first.
Returns `402` with `{ error, clientCount, proThreshold: 51 }` if false.
Never call Anthropic API before this check.

### Stripe integration
- Per-client quantity-based subscription
- Webhooks: `invoice.payment_succeeded` → ACTIVE, `invoice.payment_failed` → PAST_DUE, `customer.subscription.deleted` → CANCELLED
- Billing settings page shows current tier, client count, estimated charge, and Stripe portal link

---

## 8) New MVP Features

### 8.1 PDF Risk Score Card Export

**Purpose:** One-click PDF of a client's compliance posture for CPA client meetings.

**Implementation:** `@react-pdf/renderer` server-side render. Endpoint: `GET /api/clients/[clientId]/export/scorecard`. Rate limit: 20 exports/firmId/hour (Redis).

**PDF sections:**
1. Header — firm name, client name, entity, generated date
2. Nexus Exposure table — state, revenue YTD, % threshold, status (color-coded)
3. Registration Gaps — Triggered states without active registration
4. Upcoming Deadlines — next 30 days
5. AI Narrative — always included (standard all tiers); pulled from Redis cache if available; section skipped gracefully if cache miss and generation fails

**File naming:** `{ClientName}_ComplianceScorecard_{YYYY-MM-DD}.pdf`

### 8.2 Nexus Trigger Date Lookup

**Purpose:** Exact month an entity first crossed 70/90/100% of threshold per state. Used for audit defense and late registration paperwork.

**Implementation:** `NexusHistoryEngine` (pure function, see Section 5.3). Endpoint: `GET /api/entities/[entityId]/nexus-history?stateCode=`

**UI:** Collapsible section under Nexus table on client dashboard. Columns: State | First Warning | First Urgent | First Triggered | Data Quality Note.

### 8.3 Staff Workload View

**Purpose:** Firm admin view of filing load per staff member to prevent overload and missed filings.

**Implementation:** Aggregation query across `FilingRecord.assignedUserId` and `Alert`. Endpoint: `GET /api/team/workload`

**Workload score formula:** `overdueCount×3 + urgentAlertCount×2 + deadlinesThisMonth×1`

**Unassigned clients:** Summary bar includes count of clients with no `assignedUserId`. Amber banner shown if count > 0.

**Score bands:** 0–5 = green (Light), 6–15 = amber (Moderate), 16+ = red (Heavy)

**FIRM_ADMIN only** — 403 for all other roles.

Includes bulk reassign dialog for client/filing reassignment when staff leave.

---

---

## 9) Threshold Monitoring System (NEW — v6)

### 9.1 Purpose

RegiTrackr maintains economic nexus thresholds for all 50 states + DC. These thresholds change — states update dollar amounts, add transaction count rules, change measurement periods, and create exemptions. The threshold monitoring system uses AI-assisted weekly scraping to detect potential changes and queue them for human review before any update goes live.

**Marketing positioning:** "AI-monitored threshold database — our system checks all 50 state revenue department pages weekly and flags potential changes automatically. Every threshold is human-verified before going live."

### 9.2 StateThreshold Schema Additions

New fields on the existing `StateThreshold` model:

```
dataConfidenceLevel  String    @default("VERIFIED")
  // VERIFIED | PENDING_REVIEW | FLAGGED | UNVERIFIED

lastVerifiedDate     DateTime?
  // Date a human or AI last confirmed this threshold is current

lastVerifiedBy       String?
  // "MANUAL" | "AI_SCRAPE" | userId of admin who verified

nextReviewDue        DateTime?
  // Set to lastVerifiedDate + 90 days on every verification

source_url           String?
  // Official state revenue dept URL — required on all records
```

### 9.3 ThresholdChangeFlag Model

```
model ThresholdChangeFlag {
  id                String   @id @default(cuid())
  stateCode         String
  stateThresholdId  String
  stateThreshold    StateThreshold @relation(...)

  flagType          String
  // AMOUNT_CHANGE | NEW_RULE | PAGE_STRUCTURE_CHANGE | MANUAL_REPORT | SCRAPE_ERROR

  detectedValue     String?   // What the scraper found (JSON)
  currentValue      String?   // What we currently store (JSON)
  sourceUrl         String?
  rawSnippet        String?   @db.Text  // max 500 chars of page text
  confidence        String?   // HIGH | MEDIUM | LOW (from AI analysis)

  status            String   @default("PENDING")
  // PENDING | REVIEWED_NO_CHANGE | UPDATED | DISMISSED

  reviewedBy        String?
  reviewedAt        DateTime?
  reviewNote        String?
  detectedAt        DateTime @default(now())

  @@index([stateCode, status])
  @@index([status, detectedAt])
}
```

### 9.4 AI Monitoring Job

**Job: `threshold/monitor-state`** (Inngest, invoked per-state)

Steps:
1. **FETCH** — GET the `source_url` (15s timeout). On fetch failure → create SCRAPE_ERROR flag, return.
2. **STRIP** — Remove HTML tags, truncate to 3,000 characters.
3. **ANALYZE** — Send to Anthropic Claude API with structured prompt. Model returns JSON:
   ```json
   {
     "changeDetected": boolean,
     "confidence": "HIGH" | "MEDIUM" | "LOW",
     "detectedSalesThreshold": number | null,
     "detectedTransactionThreshold": number | null,
     "relevantSnippet": string | null,
     "reasoning": string
   }
   ```
4. **EVALUATE**:
   - `changeDetected: true` AND confidence HIGH or MEDIUM → create AMOUNT_CHANGE flag (PENDING)
   - `changeDetected: false` OR confidence LOW → update `lastVerifiedDate`, `lastVerifiedBy: "AI_SCRAPE"`, `nextReviewDue: +90 days`, `dataConfidenceLevel: VERIFIED`
   - JSON parse error → create SCRAPE_ERROR flag

**Job: `threshold/monitor-all`** (Inngest, scheduled)
- Schedule: `0 3 * * 1` (3am UTC every Monday)
- Queries all StateThreshold where `source_url IS NOT NULL AND nextReviewDue <= now()`
- Fan-out invokes `threshold/monitor-state` in batches of 10 with 2s delay
- Max 60 states per run
- Estimated cost: ~$0.08–$0.15 per full weekly run (negligible)

**Error mapping:**
- SCRAPE_ERROR → Sentry WARNING (not fatal — site may be temporarily down)
- Repeated SCRAPE_ERROR on same state (3+ consecutive) → Sentry ERROR

### 9.5 Admin Review UI

Route: `/admin/threshold-flags` (restricted to `process.env.ADMIN_EMAIL`)

**Summary bar:** Pending flags count (amber if > 0) | Reviewed this week | States missing source_url (red if > 0) | Next scheduled run

**Pending flags table:** State | Flag Type | Detected Value | Current Value | Confidence | Detected At | Snippet | Actions
- Actions: **Update Threshold** (opens drawer to edit + mark UPDATED) | **No Change** (marks REVIEWED_NO_CHANGE, updates verification dates) | **Dismiss** (requires note)
- Update Threshold triggers `invalidateAllNarratives()` — threshold changes invalidate all entity narrative caches

**All states table:** State | Sales Threshold | Transaction Threshold | Confidence | Last Verified | Next Review Due | Source URL | Verify Now
- Overdue rows: amber row highlight
- Missing source_url: red "Missing URL" badge
- "Verify Now" button: immediately invokes `threshold/monitor-state` for that state

### 9.6 Customer-Facing Trust Signals

**Verified badge** on every state threshold row in the CPA UI:
- Verified within 90 days → green badge "✓ Verified [date]" (links to source_url)
- Verified > 90 days ago → amber badge "⚠ Review due"
- PENDING_REVIEW or FLAGGED → amber badge "Under review"

**Flag an error link** on every state row:
- "Report an error" (text-xs, subtle) → popover with textarea + submit
- Creates MANUAL_REPORT flag, logs firmId
- Toast: "Thanks — we'll review this within 48 hours."
- API route: `POST /api/threshold-flags`

**Settings page copy:**
> "RegiTrackr maintains economic nexus thresholds for all 50 states + DC. Our AI monitoring system checks official state revenue department pages weekly and flags potential changes for human review. All thresholds are verified before updates go live."
> Shows: count of VERIFIED states, date of last monitoring run.


## 10) API Design (MVP)

**Principles:**
- Tenant scoping enforced in every handler and service
- `firm_id` ALWAYS from session (`getTenantContext()`), never from request body or params
- Zod schemas for all inputs and outputs
- `BaseService.assertFirmScope()` called on every record before returning

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/clients` | All clients for firm |
| GET | `/api/clients/[clientId]/dashboard` | Client dashboard data |
| GET | `/api/clients/[clientId]/export/scorecard` | PDF export |
| GET | `/api/entities/[entityId]/nexus` | Nexus results |
| GET | `/api/entities/[entityId]/nexus-history` | Trigger date lookup |
| GET | `/api/entities/[entityId]/filings` | Filing schedule |
| POST | `/api/revenue-entries` | Single entry |
| POST | `/api/revenue-entries/import` | CSV bulk import (up to 10,000 rows) |
| GET | `/api/revenue-entries/template` | CSV template download |
| PATCH | `/api/filings/[filingId]/status` | Status update (note required) |
| POST | `/api/alerts/[alertId]/snooze` | Snooze alert (note required) |
| POST | `/api/narratives/[entityId]` | Generate/return narrative |
| POST | `/api/narratives/[entityId]/digest` | One-sentence digest |
| GET | `/api/team/workload` | Staff workload (admin only) |
| PATCH | `/api/team/reassign` | Bulk client reassign (admin only) |
| POST | `/api/webhooks/clerk` | User provisioning |
| POST | `/api/webhooks/stripe` | Billing status updates |
| POST | `/api/inngest` | Job runner endpoint |
| POST | `/api/threshold-flags` | Report a threshold error (firm-scoped, logged) |
| GET | `/api/admin/threshold-flags` | List flags for admin review (admin only) |
| PATCH | `/api/admin/threshold-flags/[id]` | Update flag status (admin only) |

---

## 11) Jobs & Scheduling

All jobs: idempotent, 3-retry with exponential backoff, structured logging.

| Job | Schedule | Description |
|-----|----------|-------------|
| nexus-recalculation | `0 2 * * *` (2am UTC) | Recalculate nexus + emit alerts for all entities |
| deadline-refresh | `0 3 * * *` (3am UTC) | Regenerate filing schedules + mark overdue |
| reminder-dispatch | `0 12 * * *` (12pm UTC = 7am ET) | Send reminders; Monday = weekly digest |
| narrative-cache-refresh | `0 4 * * *` (4am UTC) | Pre-warm narratives expiring within 2 hours |
| threshold-monitor-all | `0 3 * * 1` (3am UTC, Mondays) | AI-scrape all state revenue dept pages; fan-out per state; flag changes for human review |

**Timezone note (MVP limitation):** Reminder dispatch runs at fixed 12pm UTC. Per-firm timezone scheduling is V2. `Firm.timezone` field exists in schema for future use.

---

## 12) Security & Privacy

### Data isolation
- `BaseService.assertFirmScope(record)` throws `TenancyViolationError` if `record.firmId !== this.firmId`
- `TenancyViolationError` triggers immediate Sentry FATAL alert
- RLS policies in Supabase as second layer

### Field-level encryption
- **EIN** — encrypted with AES-256-GCM before storage; decrypted only for CPA staff (FIRM_ADMIN, STAFF_ACCOUNTANT)
- **State account numbers** — encrypted same way; masked (`****1234`) for portal users and in logs
- `ENCRYPTION_KEY` from environment (32-byte hex)
- NEVER include EIN, account numbers, or any encrypted fields in LLM prompts or logs

### Prompt injection protection
`sanitizeForPrompt(input: string)` applied to all DB string fields included in AI prompts:
- Strip: backticks, XML/HTML tags
- Remove: "ignore previous instructions", "system:", "assistant:", "human:", "you are now"
- Strip newlines within values

### AI surfaces
- Validate all LLM outputs against Zod schema; reject on mismatch
- Rate limit AI endpoints (10 req/firmId/minute via Redis)
- Never place secrets, firm_id, user_id, or EINs in prompts

### Auditability
- `FilingStatusHistory` — note required on every transition
- Alert snooze — note required; `snoozedByUserId` recorded
- `NarrativeHistory` — full input snapshot stored for Pro/Enterprise firms (30 days)

---

## 13) Observability & Operations

**Error severity mapping:**
- `TenancyViolationError` → Sentry FATAL + immediate alert
- `DeadlineCalculationError` → Sentry ERROR
- `NarrativeGenerationError` → Sentry WARNING (graceful degrade, not fatal)
- `ThresholdScrapeError` (single state) → Sentry WARNING
- `ThresholdScrapeError` (3+ consecutive on same state) → Sentry ERROR
- `AuthError` → Sentry INFO
- `ResourceNotFoundError` → do NOT send to Sentry

**Never log:** ENCRYPTION_KEY, API keys, EIN values, account numbers, raw prompt content, full JWT tokens.

**Runbooks required:** deploy + rollback, migration safety, backup + restore.

---

## 14) Scaling & Performance

- Indexes: `(firmId, entityId, stateCode)` on RevenueEntry, NexusRegistration, FilingRecord
- Index: `(firmId, entityId, stateCode, dueDate)` on FilingRecord
- Index: `(firmId, isRead, isSnoozed)` on Alert
- Narrative cache: Redis primary (24h) → DB secondary
- Paginate all large lists (25 rows default)
- Virtualize filing calendar list view for 500+ deadlines
- CSV import: streaming parse, batch inserts of 500 rows; single nexus recalculation at end

---

## 15) Decision Records (ADRs)

All major decisions captured in `docs/decisions/`:

| ADR | Decision |
|-----|----------|
| ADR-0001 | Database: Supabase + Prisma |
| ADR-0002 | Auth: Clerk (staff) + custom JWT (portal); per-client billing model |
| ADR-0003 | Deadline engine: weekend + holiday policy (holidays in MVP) |
| ADR-0004 | AI: standard POST API (no SSE); model selection; cost guardrails |
| ADR-0005 | Security: tenancy model + field-level encryption |
| ADR-0006 | Threshold monitoring: AI-assisted weekly scraping + mandatory human verification before any threshold update goes live |

---

## 16) MVP "Done-When" Checklist

**Engines:**
- [ ] Nexus engine deterministic tests pass (10 golden fixtures)
- [ ] Deadline engine golden tests pass (13 fixtures including holiday adjustment)
- [ ] Nexus history engine tests pass (4 fixtures)

**Security:**
- [ ] Tenancy isolation tests pass (13 cross-tenant test cases)
- [ ] Field encryption tests pass (EIN + account numbers)
- [ ] Prompt injection tests pass (4 sanitization cases)
- [ ] No unscoped queries in any service or API route
- [ ] TenancyViolationError triggers Sentry FATAL

**AI Narrative:**
- [ ] Narrative generates for all 10 eval scenarios
- [ ] Redis cache hit confirmed (<100ms)
- [ ] Narrative accessible for ALL tiers including Starter (confirmed — no gate)
- [ ] Graceful degradation: card hidden when Anthropic API unavailable
- [ ] Disclaimer present in every narrative
- [ ] Word count 150–250 on consecutive generations

**Billing:**
- [ ] activeClientCount increments on client create, decrements on archive
- [ ] Tier auto-promotes correctly at 11 and 51 client thresholds
- [ ] Monthly charge calculation correct with floor enforcement
- [ ] Stripe webhooks updating billingStatus

**New features:**
- [ ] PDF scorecard generates and downloads correctly
- [ ] Nexus trigger dates correct for entity with 12+ months of history
- [ ] Staff workload counts verified; page inaccessible to non-admin roles

**Threshold Monitoring:**
- [ ] ThresholdChangeFlag migration applied and verified
- [ ] source_url populated for all 50 states + DC before launch
- [ ] threshold/monitor-all job runs successfully on staging (confirm flags created or verification dates updated)
- [ ] Admin review UI accessible only to ADMIN_EMAIL — 403 for all others verified
- [ ] Verified badge displays correctly for VERIFIED / overdue / PENDING_REVIEW states
- [ ] Flag-an-error submission creates MANUAL_REPORT flag with firmId logged
- [ ] Update Threshold flow correctly invalidates all entity narrative caches
- [ ] Legal review of ToS threshold data disclaimer completed before launch

**Operations:**
- [ ] Basic dashboards functional (client list, client dashboard, calendar, portal)
- [ ] All Inngest jobs running and confirmed idempotent
- [ ] Sentry receiving errors from staging
- [ ] Release runbook + rollback procedure tested in staging
- [ ] All 5 ADRs written and reviewed by Monty
