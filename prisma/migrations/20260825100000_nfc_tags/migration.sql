-- CreateTable
CREATE TABLE "NfcTag" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "serialNumber" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "registeredBy" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedBy" TEXT,
    "deactivatedAt" TIMESTAMP(3),
    "deactivatedReason" TEXT,

    CONSTRAINT "NfcTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NfcTag_token_key" ON "NfcTag"("token");

-- CreateIndex
CREATE INDEX "NfcTag_entityType_entityId_idx" ON "NfcTag"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "NfcTag_entityType_entityId_active_idx" ON "NfcTag"("entityType", "entityId", "active");
