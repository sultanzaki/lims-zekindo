-- AlterTable
ALTER TABLE "BusinessUnit" ADD COLUMN "portalToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BusinessUnit_portalToken_key" ON "BusinessUnit"("portalToken");
