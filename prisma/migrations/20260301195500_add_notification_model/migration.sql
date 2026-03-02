CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT,
    "entityId" TEXT,
    "filingRecordId" TEXT,
    "notificationType" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_firmId_createdAt_idx" ON "Notification"("firmId", "createdAt");
CREATE INDEX "Notification_firmId_notificationType_idx" ON "Notification"("firmId", "notificationType");
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX "Notification_clientId_idx" ON "Notification"("clientId");
CREATE INDEX "Notification_entityId_idx" ON "Notification"("entityId");
CREATE INDEX "Notification_filingRecordId_idx" ON "Notification"("filingRecordId");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_firmId_fkey"
FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_entityId_fkey"
FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_filingRecordId_fkey"
FOREIGN KEY ("filingRecordId") REFERENCES "FilingRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
