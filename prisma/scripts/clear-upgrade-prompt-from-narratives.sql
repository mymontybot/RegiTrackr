-- One-off cleanup: remove any cached narrative/summary rows that contain the legacy
-- "Pro required" upgrade prompt text. Run against your database when needed:
--
--   psql $DATABASE_URL -f prisma/scripts/clear-upgrade-prompt-from-narratives.sql
--
-- Or with Prisma: npx prisma db execute --file prisma/scripts/clear-upgrade-prompt-from-narratives.sql

DELETE FROM "AiSummary" WHERE "summaryText" LIKE '%Pro required%';
DELETE FROM "NarrativeHistory" WHERE "summaryText" LIKE '%Pro required%';
