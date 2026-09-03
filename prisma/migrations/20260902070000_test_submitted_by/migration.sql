-- AlterTable
ALTER TABLE "Test" ADD COLUMN "submittedById" TEXT;

-- CreateIndex
CREATE INDEX "Test_submittedById_idx" ON "Test"("submittedById");

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
