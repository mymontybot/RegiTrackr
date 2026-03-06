-- AlterTable
ALTER TABLE "StateThreshold" ADD COLUMN     "dataConfidenceLevel" TEXT NOT NULL DEFAULT 'VERIFIED',
ADD COLUMN     "lastVerifiedBy" TEXT,
ADD COLUMN     "lastVerifiedDate" TIMESTAMP(3),
ADD COLUMN     "nextReviewDue" TIMESTAMP(3),
ADD COLUMN     "source_url" TEXT;

-- CreateTable
CREATE TABLE "ThresholdChangeFlag" (
    "id" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "stateThresholdId" TEXT NOT NULL,
    "flagType" TEXT NOT NULL,
    "detectedValue" TEXT,
    "currentValue" TEXT,
    "sourceUrl" TEXT,
    "rawSnippet" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThresholdChangeFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ThresholdChangeFlag_stateCode_status_idx" ON "ThresholdChangeFlag"("stateCode", "status");

-- CreateIndex
CREATE INDEX "ThresholdChangeFlag_status_detectedAt_idx" ON "ThresholdChangeFlag"("status", "detectedAt");

-- AddForeignKey
ALTER TABLE "ThresholdChangeFlag" ADD CONSTRAINT "ThresholdChangeFlag_stateThresholdId_fkey" FOREIGN KEY ("stateThresholdId") REFERENCES "StateThreshold"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
