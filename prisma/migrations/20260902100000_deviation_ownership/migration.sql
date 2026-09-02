-- AlterTable
ALTER TABLE "Deviation" ADD COLUMN "assigneeId" TEXT,
ADD COLUMN "dueDate" TIMESTAMP(3),
ADD COLUMN "severity" TEXT;

-- CreateIndex
CREATE INDEX "Deviation_assigneeId_idx" ON "Deviation"("assigneeId");

-- AddForeignKey
ALTER TABLE "Deviation" ADD CONSTRAINT "Deviation_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
