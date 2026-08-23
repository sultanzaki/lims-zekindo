-- CreateTable
CREATE TABLE "TestAttachment" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestAttachment_testId_idx" ON "TestAttachment"("testId");

-- AddForeignKey
ALTER TABLE "TestAttachment" ADD CONSTRAINT "TestAttachment_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

