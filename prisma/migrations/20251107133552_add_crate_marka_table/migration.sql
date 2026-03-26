-- CreateTable
CREATE TABLE "crate_marka" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "crateMarkaName" TEXT NOT NULL,
    "printAs" TEXT,
    "opQty" REAL NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "crate_marka_companyId_idx" ON "crate_marka"("companyId");

-- CreateIndex
CREATE INDEX "crate_marka_crateMarkaName_idx" ON "crate_marka"("crateMarkaName");
