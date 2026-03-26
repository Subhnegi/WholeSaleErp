-- CreateTable
CREATE TABLE "store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeName" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "store_companyId_idx" ON "store"("companyId");

-- CreateIndex
CREATE INDEX "store_storeName_idx" ON "store"("storeName");

-- AlterTable: Add storesCount to backup_tracking
PRAGMA foreign_keys=off;

CREATE TABLE "backup_tracking_new" (
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
    "crateMarkasCount" INTEGER NOT NULL DEFAULT 0,
    "arrivalTypesCount" INTEGER NOT NULL DEFAULT 0,
    "packingsCount" INTEGER NOT NULL DEFAULT 0,
    "storesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "backup_tracking_new" (
    "id", "backupTimestamp", "backupFileName", "backupLocation", "backupSize",
    "recordsBackedUp", "companyId", "status", "companiesCount", "accountGroupsCount",
    "accountsCount", "itemsCount", "crateMarkasCount", "arrivalTypesCount", "packingsCount",
    "createdAt"
)
SELECT 
    "id", "backupTimestamp", "backupFileName", "backupLocation", "backupSize",
    "recordsBackedUp", "companyId", "status", "companiesCount", "accountGroupsCount",
    "accountsCount", "itemsCount", "crateMarkasCount", "arrivalTypesCount", "packingsCount",
    "createdAt"
FROM "backup_tracking";

DROP TABLE "backup_tracking";
ALTER TABLE "backup_tracking_new" RENAME TO "backup_tracking";

CREATE INDEX "backup_tracking_backupTimestamp_idx" ON "backup_tracking"("backupTimestamp");
CREATE INDEX "backup_tracking_companyId_idx" ON "backup_tracking"("companyId");
CREATE INDEX "backup_tracking_backupFileName_idx" ON "backup_tracking"("backupFileName");

PRAGMA foreign_keys=on;
