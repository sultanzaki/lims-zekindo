-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "locationId" TEXT;

-- AlterTable
ALTER TABLE "Reagent" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'Reagent',
ADD COLUMN     "locationId" TEXT;

-- AlterTable
ALTER TABLE "Sample" ADD COLUMN     "businessUnitId" TEXT,
ADD COLUMN     "requestorName" TEXT;

-- CreateTable
CREATE TABLE "BusinessUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentEvent" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "detail" TEXT,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextDueAt" TIMESTAMP(3),
    "attachmentFileName" TEXT,
    "attachmentFileType" TEXT,
    "attachmentFileSize" INTEGER,
    "attachmentStoragePath" TEXT,

    CONSTRAINT "EquipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReagentTransaction" (
    "id" TEXT NOT NULL,
    "reagentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantityChange" DOUBLE PRECISION NOT NULL,
    "quantityAfter" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReagentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessUnit_name_key" ON "BusinessUnit"("name");

-- CreateIndex
CREATE INDEX "EquipmentEvent_equipmentId_idx" ON "EquipmentEvent"("equipmentId");

-- CreateIndex
CREATE INDEX "ReagentTransaction_reagentId_idx" ON "ReagentTransaction"("reagentId");

-- CreateIndex
CREATE UNIQUE INDEX "StorageLocation_name_key" ON "StorageLocation"("name");

-- CreateIndex
CREATE INDEX "Equipment_locationId_idx" ON "Equipment"("locationId");

-- CreateIndex
CREATE INDEX "Reagent_locationId_idx" ON "Reagent"("locationId");

-- CreateIndex
CREATE INDEX "Sample_businessUnitId_idx" ON "Sample"("businessUnitId");

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StorageLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentEvent" ADD CONSTRAINT "EquipmentEvent_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reagent" ADD CONSTRAINT "Reagent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StorageLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReagentTransaction" ADD CONSTRAINT "ReagentTransaction_reagentId_fkey" FOREIGN KEY ("reagentId") REFERENCES "Reagent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
