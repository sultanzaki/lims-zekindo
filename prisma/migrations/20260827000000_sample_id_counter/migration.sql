-- Atomic sample-ID counter (fixes race-condition + ID format bugs in getNextSampleId)
CREATE TABLE "SampleIdCounter" (
    "id" TEXT NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 144,
    CONSTRAINT "SampleIdCounter_pkey" PRIMARY KEY ("id")
);

-- Seed the counter at the current max Sample ID so newly created samples
-- continue the sequence instead of restarting at 145.
INSERT INTO "SampleIdCounter" ("id", "lastValue")
SELECT 'default',
       GREATEST(144, COALESCE(MAX(NULLIF(regexp_replace("id", '^LAB-24-0*', ''), '')::int), 144))
FROM "Sample"
WHERE "id" LIKE 'LAB-24-%';
