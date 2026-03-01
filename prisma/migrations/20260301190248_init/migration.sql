-- CreateEnum
CREATE TYPE "BillingTier" AS ENUM ('STARTER', 'GROWTH', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FIRM_ADMIN', 'STAFF_ACCOUNTANT', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('LLC', 'S_CORP', 'C_CORP', 'PARTNERSHIP', 'SOLE_PROPRIETOR', 'NON_PROFIT', 'TRUST', 'OTHER');

-- CreateEnum
CREATE TYPE "MeasurementPeriod" AS ENUM ('CALENDAR_YEAR', 'ROLLING_12_MONTHS', 'PRIOR_YEAR');

-- CreateEnum
CREATE TYPE "FilingFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "NexusBand" AS ENUM ('SAFE', 'WARNING', 'URGENT', 'TRIGGERED', 'REGISTERED');

-- CreateEnum
CREATE TYPE "NexusRegistrationStatus" AS ENUM ('MONITORING', 'REGISTERED', 'EXEMPT', 'IGNORED');

-- CreateEnum
CREATE TYPE "FilingStatus" AS ENUM ('UPCOMING', 'PREPARED', 'FILED', 'CONFIRMED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('WARNING_70', 'URGENT_90', 'TRIGGERED_100', 'TRIGGERED_NOT_REGISTERED', 'OVERDUE_FILING');

-- CreateEnum
CREATE TYPE "RevenueSource" AS ENUM ('MANUAL', 'CSV_IMPORT', 'CLIENT_PORTAL');

-- CreateEnum
CREATE TYPE "DataConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "Firm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "supportEmail" TEXT,
    "billingTier" "BillingTier" NOT NULL DEFAULT 'STARTER',
    "billingStatus" "BillingStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "activeClientCount" INTEGER NOT NULL DEFAULT 0,
    "monthlyFloor" INTEGER NOT NULL DEFAULT 99,
    "pricePerClient" INTEGER NOT NULL,
    "alertPreferences" JSONB,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Firm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "ein" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateThreshold" (
    "id" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "stateName" TEXT NOT NULL,
    "salesThreshold" DECIMAL(14,2) NOT NULL,
    "transactionThreshold" INTEGER,
    "measurementPeriod" "MeasurementPeriod" NOT NULL,
    "exemptCategories" JSONB,
    "effectiveDate" DATE NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL,
    "dataConfidence" "DataConfidence" NOT NULL,
    "notes" TEXT,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StateThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateFilingRule" (
    "id" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "filingFrequency" "FilingFrequency" NOT NULL,
    "revenueThresholdForFrequency" DECIMAL(14,2),
    "dueDateDaysAfterPeriod" INTEGER NOT NULL,
    "notes" TEXT,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StateFilingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicHoliday" (
    "id" TEXT NOT NULL,
    "stateCode" TEXT,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "PublicHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueEntry" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "source" "RevenueSource" NOT NULL,
    "enteredByUserId" TEXT,
    "clientAcknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NexusRegistration" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "status" "NexusRegistrationStatus" NOT NULL,
    "registrationDate" DATE,
    "filingFrequency" "FilingFrequency",
    "stateAccountNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NexusRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilingRecord" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER,
    "periodQuarter" INTEGER,
    "dueDate" DATE NOT NULL,
    "status" "FilingStatus" NOT NULL DEFAULT 'UPCOMING',
    "assignedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilingStatusHistory" (
    "id" TEXT NOT NULL,
    "filingRecordId" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "previousStatus" "FilingStatus",
    "newStatus" "FilingStatus" NOT NULL,
    "note" TEXT NOT NULL,
    "changedByUserId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilingStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "alertType" "AlertType" NOT NULL,
    "band" "NexusBand" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isSnoozed" BOOLEAN NOT NULL DEFAULT false,
    "snoozedUntil" TIMESTAMP(3),
    "snoozedByUserId" TEXT,
    "snoozeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSummary" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT,
    "entityId" TEXT,
    "summaryType" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "summaryText" TEXT NOT NULL,
    "highlights" JSONB,
    "dataQualityFlags" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "modelId" TEXT NOT NULL,
    "refreshReason" TEXT,
    "createdByUserId" TEXT,

    CONSTRAINT "AiSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NarrativeHistory" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "summaryText" TEXT NOT NULL,
    "highlights" JSONB,
    "dataQualityFlags" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "modelId" TEXT NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "retainUntil" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NarrativeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "canSubmitRevenue" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalInvitation" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Firm_slug_key" ON "Firm"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Firm_stripeCustomerId_key" ON "Firm"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Firm_stripeSubscriptionId_key" ON "Firm"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

-- CreateIndex
CREATE INDEX "User_firmId_idx" ON "User"("firmId");

-- CreateIndex
CREATE UNIQUE INDEX "User_firmId_email_key" ON "User"("firmId", "email");

-- CreateIndex
CREATE INDEX "Client_firmId_idx" ON "Client"("firmId");

-- CreateIndex
CREATE INDEX "Entity_firmId_clientId_idx" ON "Entity"("firmId", "clientId");

-- CreateIndex
CREATE INDEX "StateThreshold_stateCode_effectiveDate_idx" ON "StateThreshold"("stateCode", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "StateThreshold_stateCode_version_key" ON "StateThreshold"("stateCode", "version");

-- CreateIndex
CREATE INDEX "StateFilingRule_stateCode_idx" ON "StateFilingRule"("stateCode");

-- CreateIndex
CREATE UNIQUE INDEX "StateFilingRule_stateCode_filingFrequency_version_key" ON "StateFilingRule"("stateCode", "filingFrequency", "version");

-- CreateIndex
CREATE INDEX "PublicHoliday_stateCode_year_idx" ON "PublicHoliday"("stateCode", "year");

-- CreateIndex
CREATE UNIQUE INDEX "PublicHoliday_stateCode_date_name_key" ON "PublicHoliday"("stateCode", "date", "name");

-- CreateIndex
CREATE INDEX "RevenueEntry_firmId_entityId_stateCode_idx" ON "RevenueEntry"("firmId", "entityId", "stateCode");

-- CreateIndex
CREATE INDEX "NexusRegistration_firmId_entityId_stateCode_idx" ON "NexusRegistration"("firmId", "entityId", "stateCode");

-- CreateIndex
CREATE UNIQUE INDEX "NexusRegistration_entityId_stateCode_key" ON "NexusRegistration"("entityId", "stateCode");

-- CreateIndex
CREATE INDEX "FilingRecord_firmId_entityId_stateCode_idx" ON "FilingRecord"("firmId", "entityId", "stateCode");

-- CreateIndex
CREATE INDEX "FilingRecord_firmId_entityId_stateCode_dueDate_idx" ON "FilingRecord"("firmId", "entityId", "stateCode", "dueDate");

-- CreateIndex
CREATE INDEX "FilingStatusHistory_filingRecordId_idx" ON "FilingStatusHistory"("filingRecordId");

-- CreateIndex
CREATE INDEX "FilingStatusHistory_firmId_changedAt_idx" ON "FilingStatusHistory"("firmId", "changedAt");

-- CreateIndex
CREATE INDEX "Alert_firmId_isRead_isSnoozed_idx" ON "Alert"("firmId", "isRead", "isSnoozed");

-- CreateIndex
CREATE INDEX "AiSummary_entityId_summaryType_idx" ON "AiSummary"("entityId", "summaryType");

-- CreateIndex
CREATE INDEX "AiSummary_firmId_inputHash_idx" ON "AiSummary"("firmId", "inputHash");

-- CreateIndex
CREATE INDEX "NarrativeHistory_entityId_retainUntil_idx" ON "NarrativeHistory"("entityId", "retainUntil");

-- CreateIndex
CREATE INDEX "PortalUser_firmId_clientId_idx" ON "PortalUser"("firmId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalUser_firmId_email_key" ON "PortalUser"("firmId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "PortalInvitation_token_key" ON "PortalInvitation"("token");

-- CreateIndex
CREATE INDEX "PortalInvitation_firmId_clientId_idx" ON "PortalInvitation"("firmId", "clientId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueEntry" ADD CONSTRAINT "RevenueEntry_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueEntry" ADD CONSTRAINT "RevenueEntry_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueEntry" ADD CONSTRAINT "RevenueEntry_enteredByUserId_fkey" FOREIGN KEY ("enteredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NexusRegistration" ADD CONSTRAINT "NexusRegistration_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NexusRegistration" ADD CONSTRAINT "NexusRegistration_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingRecord" ADD CONSTRAINT "FilingRecord_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingRecord" ADD CONSTRAINT "FilingRecord_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingRecord" ADD CONSTRAINT "FilingRecord_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingStatusHistory" ADD CONSTRAINT "FilingStatusHistory_filingRecordId_fkey" FOREIGN KEY ("filingRecordId") REFERENCES "FilingRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingStatusHistory" ADD CONSTRAINT "FilingStatusHistory_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingStatusHistory" ADD CONSTRAINT "FilingStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_snoozedByUserId_fkey" FOREIGN KEY ("snoozedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSummary" ADD CONSTRAINT "AiSummary_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSummary" ADD CONSTRAINT "AiSummary_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSummary" ADD CONSTRAINT "AiSummary_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSummary" ADD CONSTRAINT "AiSummary_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NarrativeHistory" ADD CONSTRAINT "NarrativeHistory_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NarrativeHistory" ADD CONSTRAINT "NarrativeHistory_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalInvitation" ADD CONSTRAINT "PortalInvitation_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalInvitation" ADD CONSTRAINT "PortalInvitation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
