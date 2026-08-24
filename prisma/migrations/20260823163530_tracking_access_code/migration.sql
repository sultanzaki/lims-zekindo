-- AlterTable
ALTER TABLE "Sample" ADD COLUMN     "accessCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sample_accessCode_key" ON "Sample"("accessCode");
