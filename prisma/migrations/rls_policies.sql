/*
  RegiTrackr RLS policy bootstrap for Supabase.

  Service-layer contract:
  - Before executing tenant-scoped queries in a request, the service layer begins
    a transaction and sets the tenant context with:
      SET LOCAL app.current_firm_id = '<firm-id>';
  - All tenant table access is then constrained by RLS policies that compare each
    row's tenant key to current_setting('app.current_firm_id', true).
  - If app.current_firm_id is missing, policies evaluate to false and deny access.
*/

BEGIN;

-- ---------------------------------------------------------------------------
-- Tenant root table policy (Firm is keyed by id, not firmId)
-- ---------------------------------------------------------------------------
ALTER TABLE "Firm" ENABLE ROW LEVEL SECURITY;

CREATE POLICY firm_select_scope ON "Firm"
  FOR SELECT
  USING ("id" = current_setting('app.current_firm_id', true));

CREATE POLICY firm_insert_scope ON "Firm"
  FOR INSERT
  WITH CHECK ("id" = current_setting('app.current_firm_id', true));

CREATE POLICY firm_update_scope ON "Firm"
  FOR UPDATE
  USING ("id" = current_setting('app.current_firm_id', true))
  WITH CHECK ("id" = current_setting('app.current_firm_id', true));

CREATE POLICY firm_delete_scope ON "Firm"
  FOR DELETE
  USING ("id" = current_setting('app.current_firm_id', true));

-- ---------------------------------------------------------------------------
-- Tenant-owned tables scoped by firmId
-- ---------------------------------------------------------------------------
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_select_scope ON "User" FOR SELECT USING ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY user_insert_scope ON "User" FOR INSERT WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY user_update_scope ON "User" FOR UPDATE USING ("firmId" = current_setting('app.current_firm_id', true)) WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY user_delete_scope ON "User" FOR DELETE USING ("firmId" = current_setting('app.current_firm_id', true));

ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_select_scope ON "Client" FOR SELECT USING ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY client_insert_scope ON "Client" FOR INSERT WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY client_update_scope ON "Client" FOR UPDATE USING ("firmId" = current_setting('app.current_firm_id', true)) WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY client_delete_scope ON "Client" FOR DELETE USING ("firmId" = current_setting('app.current_firm_id', true));

ALTER TABLE "Entity" ENABLE ROW LEVEL SECURITY;
CREATE POLICY entity_select_scope ON "Entity" FOR SELECT USING ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY entity_insert_scope ON "Entity" FOR INSERT WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY entity_update_scope ON "Entity" FOR UPDATE USING ("firmId" = current_setting('app.current_firm_id', true)) WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY entity_delete_scope ON "Entity" FOR DELETE USING ("firmId" = current_setting('app.current_firm_id', true));

ALTER TABLE "RevenueEntry" ENABLE ROW LEVEL SECURITY;
CREATE POLICY revenue_entry_select_scope ON "RevenueEntry" FOR SELECT USING ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY revenue_entry_insert_scope ON "RevenueEntry" FOR INSERT WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY revenue_entry_update_scope ON "RevenueEntry" FOR UPDATE USING ("firmId" = current_setting('app.current_firm_id', true)) WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY revenue_entry_delete_scope ON "RevenueEntry" FOR DELETE USING ("firmId" = current_setting('app.current_firm_id', true));

ALTER TABLE "NexusRegistration" ENABLE ROW LEVEL SECURITY;
CREATE POLICY nexus_registration_select_scope ON "NexusRegistration" FOR SELECT USING ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY nexus_registration_insert_scope ON "NexusRegistration" FOR INSERT WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY nexus_registration_update_scope ON "NexusRegistration" FOR UPDATE USING ("firmId" = current_setting('app.current_firm_id', true)) WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY nexus_registration_delete_scope ON "NexusRegistration" FOR DELETE USING ("firmId" = current_setting('app.current_firm_id', true));

ALTER TABLE "FilingRecord" ENABLE ROW LEVEL SECURITY;
CREATE POLICY filing_record_select_scope ON "FilingRecord" FOR SELECT USING ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY filing_record_insert_scope ON "FilingRecord" FOR INSERT WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY filing_record_update_scope ON "FilingRecord" FOR UPDATE USING ("firmId" = current_setting('app.current_firm_id', true)) WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY filing_record_delete_scope ON "FilingRecord" FOR DELETE USING ("firmId" = current_setting('app.current_firm_id', true));

ALTER TABLE "FilingStatusHistory" ENABLE ROW LEVEL SECURITY;
CREATE POLICY filing_status_history_select_scope ON "FilingStatusHistory" FOR SELECT USING ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY filing_status_history_insert_scope ON "FilingStatusHistory" FOR INSERT WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY filing_status_history_update_scope ON "FilingStatusHistory" FOR UPDATE USING ("firmId" = current_setting('app.current_firm_id', true)) WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY filing_status_history_delete_scope ON "FilingStatusHistory" FOR DELETE USING ("firmId" = current_setting('app.current_firm_id', true));

ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;
CREATE POLICY alert_select_scope ON "Alert" FOR SELECT USING ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY alert_insert_scope ON "Alert" FOR INSERT WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY alert_update_scope ON "Alert" FOR UPDATE USING ("firmId" = current_setting('app.current_firm_id', true)) WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY alert_delete_scope ON "Alert" FOR DELETE USING ("firmId" = current_setting('app.current_firm_id', true));

ALTER TABLE "AiSummary" ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_summary_select_scope ON "AiSummary" FOR SELECT USING ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY ai_summary_insert_scope ON "AiSummary" FOR INSERT WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY ai_summary_update_scope ON "AiSummary" FOR UPDATE USING ("firmId" = current_setting('app.current_firm_id', true)) WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY ai_summary_delete_scope ON "AiSummary" FOR DELETE USING ("firmId" = current_setting('app.current_firm_id', true));

ALTER TABLE "NarrativeHistory" ENABLE ROW LEVEL SECURITY;
CREATE POLICY narrative_history_select_scope ON "NarrativeHistory" FOR SELECT USING ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY narrative_history_insert_scope ON "NarrativeHistory" FOR INSERT WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY narrative_history_update_scope ON "NarrativeHistory" FOR UPDATE USING ("firmId" = current_setting('app.current_firm_id', true)) WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY narrative_history_delete_scope ON "NarrativeHistory" FOR DELETE USING ("firmId" = current_setting('app.current_firm_id', true));

ALTER TABLE "PortalUser" ENABLE ROW LEVEL SECURITY;
CREATE POLICY portal_user_select_scope ON "PortalUser" FOR SELECT USING ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY portal_user_insert_scope ON "PortalUser" FOR INSERT WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY portal_user_update_scope ON "PortalUser" FOR UPDATE USING ("firmId" = current_setting('app.current_firm_id', true)) WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY portal_user_delete_scope ON "PortalUser" FOR DELETE USING ("firmId" = current_setting('app.current_firm_id', true));

ALTER TABLE "PortalInvitation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY portal_invitation_select_scope ON "PortalInvitation" FOR SELECT USING ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY portal_invitation_insert_scope ON "PortalInvitation" FOR INSERT WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY portal_invitation_update_scope ON "PortalInvitation" FOR UPDATE USING ("firmId" = current_setting('app.current_firm_id', true)) WITH CHECK ("firmId" = current_setting('app.current_firm_id', true));
CREATE POLICY portal_invitation_delete_scope ON "PortalInvitation" FOR DELETE USING ("firmId" = current_setting('app.current_firm_id', true));

COMMIT;
