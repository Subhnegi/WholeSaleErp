/*
  Warnings:

  - You are about to drop the `items` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "items_itemName_idx";

-- DropIndex
DROP INDEX "items_companyId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "items";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Items" (
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

-- CreateTable
CREATE TABLE "arrival_type" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "arrivalTypeName" TEXT NOT NULL,
    "partyStock" BOOLEAN NOT NULL DEFAULT false,
    "selfPurchase" BOOLEAN NOT NULL DEFAULT false,
    "vehicleNo" TEXT,
    "autoRoundoffAmount" BOOLEAN NOT NULL DEFAULT false,
    "askForAdditionalFields" BOOLEAN NOT NULL DEFAULT false,
    "requireForwardingAgent" BOOLEAN NOT NULL DEFAULT false,
    "requireBroker" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" DATETIME
);

-- CreateTable
CREATE TABLE "packing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packingName" TEXT NOT NULL,
    "calculate" TEXT NOT NULL,
    "divideBy" REAL NOT NULL DEFAULT 1,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" DATETIME
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_backup_tracking" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_backup_tracking" ("accountGroupsCount", "accountsCount", "backupFileName", "backupLocation", "backupSize", "backupTimestamp", "companiesCount", "companyId", "createdAt", "id", "itemsCount", "recordsBackedUp", "status") SELECT "accountGroupsCount", "accountsCount", "backupFileName", "backupLocation", "backupSize", "backupTimestamp", "companiesCount", "companyId", "createdAt", "id", "itemsCount", "recordsBackedUp", "status" FROM "backup_tracking";
DROP TABLE "backup_tracking";
ALTER TABLE "new_backup_tracking" RENAME TO "backup_tracking";
CREATE INDEX "backup_tracking_backupTimestamp_idx" ON "backup_tracking"("backupTimestamp");
CREATE INDEX "backup_tracking_companyId_idx" ON "backup_tracking"("companyId");
CREATE INDEX "backup_tracking_backupFileName_idx" ON "backup_tracking"("backupFileName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Items_companyId_idx" ON "Items"("companyId");

-- CreateIndex
CREATE INDEX "Items_itemName_idx" ON "Items"("itemName");

-- CreateIndex
CREATE INDEX "arrival_type_companyId_idx" ON "arrival_type"("companyId");

-- CreateIndex
CREATE INDEX "arrival_type_arrivalTypeName_idx" ON "arrival_type"("arrivalTypeName");

-- CreateIndex
CREATE INDEX "packing_companyId_idx" ON "packing"("companyId");

-- CreateIndex
CREATE INDEX "packing_packingName_idx" ON "packing"("packingName");
