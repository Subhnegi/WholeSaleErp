-- CreateTable
CREATE TABLE "backup_tracking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "backupTimestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "backupFileName" TEXT NOT NULL,
    "backupLocation" TEXT NOT NULL,
    "backupSize" TEXT NOT NULL,
    "recordsBackedUp" INTEGER NOT NULL DEFAULT 0,
    "companyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "companiesCount" INTEGER NOT NULL DEFAULT 0,
    "accountGroupsCount" INTEGER NOT NULL DEFAULT 0,
    "accountsCount" INTEGER NOT NULL DEFAULT 0,
    "itemsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "code" TEXT,
    "printAs" TEXT,
    "printAsLang" TEXT,
    "commission" REAL NOT NULL DEFAULT 0,
    "commissionAsPer" TEXT,
    "marketFees" REAL NOT NULL DEFAULT 0,
    "rdf" REAL NOT NULL DEFAULT 0,
    "bardanaPerNug" REAL NOT NULL DEFAULT 0,
    "laga" REAL NOT NULL DEFAULT 0,
    "wtPerNug" REAL NOT NULL DEFAULT 0,
    "kaatPerNug" REAL NOT NULL DEFAULT 0,
    "maintainCratesInSalePurchase" BOOLEAN NOT NULL DEFAULT false,
    "disableWeight" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "backup_tracking_backupTimestamp_idx" ON "backup_tracking"("backupTimestamp");

-- CreateIndex
CREATE INDEX "backup_tracking_companyId_idx" ON "backup_tracking"("companyId");

-- CreateIndex
CREATE INDEX "backup_tracking_backupFileName_idx" ON "backup_tracking"("backupFileName");

-- CreateIndex
CREATE INDEX "items_companyId_idx" ON "items"("companyId");

-- CreateIndex
CREATE INDEX "items_itemName_idx" ON "items"("itemName");
