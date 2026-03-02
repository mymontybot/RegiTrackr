-- Add optional client owner assignment for workload management.
ALTER TABLE "Client"
ADD COLUMN "assignedUserId" TEXT;

-- Backfill client ownership from existing filing assignments by strongest signal.
WITH ranked_assignments AS (
  SELECT
    e."clientId" AS "clientId",
    fr."assignedUserId" AS "assignedUserId",
    COUNT(*) AS assignment_count,
    MAX(fr."updatedAt") AS last_assigned_at,
    ROW_NUMBER() OVER (
      PARTITION BY e."clientId"
      ORDER BY COUNT(*) DESC, MAX(fr."updatedAt") DESC
    ) AS rn
  FROM "FilingRecord" fr
  INNER JOIN "Entity" e ON e."id" = fr."entityId"
  WHERE fr."assignedUserId" IS NOT NULL
  GROUP BY e."clientId", fr."assignedUserId"
)
UPDATE "Client" c
SET "assignedUserId" = ra."assignedUserId"
FROM ranked_assignments ra
WHERE c."id" = ra."clientId"
  AND ra.rn = 1
  AND c."assignedUserId" IS NULL;

ALTER TABLE "Client"
ADD CONSTRAINT "Client_assignedUserId_fkey"
FOREIGN KEY ("assignedUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Client_firmId_assignedUserId_idx"
ON "Client"("firmId", "assignedUserId");
