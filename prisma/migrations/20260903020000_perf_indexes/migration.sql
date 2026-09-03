-- CreateIndex
CREATE INDEX "Sample_createdAt_idx" ON "Sample"("createdAt");

-- CreateIndex
CREATE INDEX "Sample_receivedDate_idx" ON "Sample"("receivedDate");

-- CreateIndex
CREATE INDEX "Equipment_status_idx" ON "Equipment"("status");

-- CreateIndex
CREATE INDEX "Equipment_name_idx" ON "Equipment"("name");

-- CreateIndex
CREATE INDEX "Reagent_category_idx" ON "Reagent"("category");

-- CreateIndex
CREATE INDEX "Reagent_name_idx" ON "Reagent"("name");
