-- CreateTable
CREATE TABLE "SampleReport" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SampleReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SampleReport_sampleId_idx" ON "SampleReport"("sampleId");

-- AddForeignKey
ALTER TABLE "SampleReport" ADD CONSTRAINT "SampleReport_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE CASCADE ON UPDATE CASCADE;
