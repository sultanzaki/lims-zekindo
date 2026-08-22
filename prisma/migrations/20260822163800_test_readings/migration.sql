-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "intervalPlan" TEXT,
ADD COLUMN     "replicateCount" INTEGER,
ADD COLUMN     "resultMode" TEXT NOT NULL DEFAULT 'SINGLE';

-- AlterTable
ALTER TABLE "TestCatalog" ADD COLUMN     "intervalPlan" TEXT,
ADD COLUMN     "replicateCount" INTEGER,
ADD COLUMN     "resultMode" TEXT NOT NULL DEFAULT 'SINGLE';

-- CreateTable
CREATE TABLE "TestReading" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "intervalLabel" TEXT,
    "replicateIndex" INTEGER,
    "value" TEXT NOT NULL,
    "note" TEXT,
    "enteredBy" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestReading_testId_idx" ON "TestReading"("testId");

-- AddForeignKey
ALTER TABLE "TestReading" ADD CONSTRAINT "TestReading_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

