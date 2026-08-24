-- AlterTable: allow StorageLocation to nest under a parent location
ALTER TABLE "StorageLocation" ADD COLUMN "parentId" TEXT;

-- DropIndex: name was globally unique; now unique per-parent (siblings only)
DROP INDEX IF EXISTS "StorageLocation_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "StorageLocation_parentId_name_key" ON "StorageLocation"("parentId", "name");

-- CreateIndex
CREATE INDEX "StorageLocation_parentId_idx" ON "StorageLocation"("parentId");

-- AddForeignKey
ALTER TABLE "StorageLocation" ADD CONSTRAINT "StorageLocation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "StorageLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
