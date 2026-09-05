-- Result-correction trail: snapshot the previous value + who/when/why when
-- an approved test result is corrected, so the CoA and audit trail always
-- show what changed.
ALTER TABLE "Test"
  ADD COLUMN "previousResult" TEXT,
  ADD COLUMN "correctionReason" TEXT,
  ADD COLUMN "correctedById" TEXT,
  ADD COLUMN "correctedAt" TIMESTAMP(3);

-- FK to User (nullable; SetNull on delete mirrors submittedBy).
ALTER TABLE "Test"
  ADD CONSTRAINT "Test_correctedById_fkey"
  FOREIGN KEY ("correctedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Test_correctedById_idx" ON "Test"("correctedById");
