-- CreateTable: WarehouseStockUpload + WarehouseStockItem
-- Run this in Supabase SQL Editor (order matters — parent table first).

-- Snapshot metadata: one row per imported Stock Ending period.
CREATE TABLE "WarehouseStockUpload" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "importedBy" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "WarehouseStockUpload_pkey" PRIMARY KEY ("id")
);

-- Per-line rows of each imported snapshot.
CREATE TABLE "WarehouseStockItem" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "productRef" TEXT,
    "productName" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "vendorLotNumber" TEXT,
    "vendorPackaging" TEXT,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WarehouseStockItem_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "WarehouseStockUpload_importedAt_idx" ON "WarehouseStockUpload"("importedAt");
CREATE INDEX "WarehouseStockItem_uploadId_idx" ON "WarehouseStockItem"("uploadId");
CREATE INDEX "WarehouseStockItem_productRef_idx" ON "WarehouseStockItem"("productRef");

-- Foreign keys (cascade delete: removing an upload removes its rows)
ALTER TABLE "WarehouseStockItem"
    ADD CONSTRAINT "WarehouseStockItem_uploadId_fkey"
    FOREIGN KEY ("uploadId") REFERENCES "WarehouseStockUpload"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
