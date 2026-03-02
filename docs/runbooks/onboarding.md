# RegiTrackr First Customer Onboarding Runbook

## Pre-onboarding (before they log in)

Collect from the CPA firm:

- Client list (name, industry).
- For each client: legal entities (name, EIN, entity type).
- For each entity: states where they sell/operate.
- For each entity/state: 12-24 months of monthly revenue by state.
- For each entity/state: existing registration status and account numbers.
- Assigned staff member per client.

Request data format:

- Revenue history: RegiTrackr CSV import template.
- Client/entity master data: simple spreadsheet, then create records via UI.

Expected setup time:

- 2-4 hours for a 20-client firm.

## During onboarding

1. Create the firm account (Clerk signup).
2. Create clients manually via dashboard (or bulk import when available).
3. Create entities for each client.
4. Enter existing `NexusRegistration` records for already-registered states.
5. Import revenue history with CSV import tool.
6. Run nexus recalculation manually by firing `regitrackr/nexus.recalculate`.
7. Review generated alerts with firm admin and explain each alert type.
8. Generate first AI narratives and review conclusions with the firm.
9. Set up portal invitations for clients who need portal access.
10. Walk through filing calendar and status update workflow together.

## Post-onboarding

- Confirm all alerts are reviewed and snoozed/actioned appropriately.
- Confirm reminder emails route to correct staff.
- Schedule a 2-week check-in call.

## Recommended quality checks

- Spot-check 3 clients for revenue totals by month/state against source files.
- Verify one registration account number displays masked in portal.
- Verify one filing status update writes history correctly.
- Confirm assigned staff workloads look correct in Team view.
