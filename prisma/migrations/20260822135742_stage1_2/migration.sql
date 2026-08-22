-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accessRole" TEXT NOT NULL DEFAULT 'TECHNICIAN',
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Sample" ADD COLUMN     "disposedAt" TIMESTAMP(3),
ADD COLUMN     "retentionUntil" TIMESTAMP(3),
ADD COLUMN     "retestOfSampleId" TEXT,
ADD COLUMN     "sampleTypeId" TEXT,
ADD COLUMN     "storageLocation" TEXT;

-- CreateTable
CREATE TABLE "SampleTypeCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetTatHours" INTEGER NOT NULL DEFAULT 48,
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SampleTypeCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCatalog" (
    "id" TEXT NOT NULL,
    "sampleTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "spec" TEXT NOT NULL,
    "method" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TestCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Operational',
    "location" TEXT,
    "lastCalibratedAt" TIMESTAMP(3),
    "nextCalibrationDue" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reagent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "minStockLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expiryDate" TIMESTAMP(3),
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reagent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deviation" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rootCause" TEXT,
    "capa" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "openedBy" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Deviation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SampleTypeCatalog_name_key" ON "SampleTypeCatalog"("name");

-- CreateIndex
CREATE INDEX "TestCatalog_sampleTypeId_idx" ON "TestCatalog"("sampleTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_assetTag_key" ON "Equipment"("assetTag");

-- CreateIndex
CREATE INDEX "Equipment_nextCalibrationDue_idx" ON "Equipment"("nextCalibrationDue");

-- CreateIndex
CREATE INDEX "Reagent_expiryDate_idx" ON "Reagent"("expiryDate");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Deviation_sampleId_idx" ON "Deviation"("sampleId");

-- CreateIndex
CREATE INDEX "Deviation_status_idx" ON "Deviation"("status");

-- CreateIndex
CREATE INDEX "User_accessRole_idx" ON "User"("accessRole");

-- CreateIndex
CREATE INDEX "Sample_status_idx" ON "Sample"("status");

-- CreateIndex
CREATE INDEX "Sample_sampleTypeId_idx" ON "Sample"("sampleTypeId");

-- CreateIndex
CREATE INDEX "Sample_retestOfSampleId_idx" ON "Sample"("retestOfSampleId");

-- CreateIndex
CREATE INDEX "Test_sampleId_idx" ON "Test"("sampleId");

-- CreateIndex
CREATE INDEX "CustodyEvent_sampleId_idx" ON "CustodyEvent"("sampleId");

-- CreateIndex
CREATE INDEX "Notification_userId_unread_idx" ON "Notification"("userId", "unread");

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_sampleTypeId_fkey" FOREIGN KEY ("sampleTypeId") REFERENCES "SampleTypeCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_retestOfSampleId_fkey" FOREIGN KEY ("retestOfSampleId") REFERENCES "Sample"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCatalog" ADD CONSTRAINT "TestCatalog_sampleTypeId_fkey" FOREIGN KEY ("sampleTypeId") REFERENCES "SampleTypeCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deviation" ADD CONSTRAINT "Deviation_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE CASCADE ON UPDATE CASCADE;

