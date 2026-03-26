/*
  Warnings:

  - You are about to drop the column `arrivalTypeName` on the `arrival_type` table. All the data in the column will be lost.
  - You are about to drop the column `autoRoundoffAmount` on the `arrival_type` table. All the data in the column will be lost.
  - You are about to drop the column `partyStock` on the `arrival_type` table. All the data in the column will be lost.
  - You are about to drop the column `selfPurchase` on the `arrival_type` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleNo` on the `arrival_type` table. All the data in the column will be lost.
  - You are about to drop the column `storeName` on the `store` table. All the data in the column will be lost.
  - Added the required column `name` to the `arrival_type` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `store` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "other_charges_head" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "headingName" TEXT NOT NULL,
    "printAs" TEXT,
    "accountHeadId" TEXT,
    "chargeType" TEXT NOT NULL DEFAULT 'plus',
    "feedAs" TEXT NOT NULL DEFAULT 'absolute',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "arrival" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "arrivalTypeId" TEXT NOT NULL,
    "vehicleChallanNo" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "storeId" TEXT,
    "transport" TEXT,
    "challanNo" TEXT,
    "remarks" TEXT,
    "forwardingAgentId" TEXT,
    "totalNug" REAL NOT NULL DEFAULT 0,
    "totalKg" REAL NOT NULL DEFAULT 0,
    "basicAmt" REAL NOT NULL DEFAULT 0,
    "charges" REAL NOT NULL DEFAULT 0,
    "netAmt" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "arrival_arrivalTypeId_fkey" FOREIGN KEY ("arrivalTypeId") REFERENCES "arrival_type" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "arrival_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "arrival_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "arrivalId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotNoVariety" TEXT,
    "nug" REAL NOT NULL DEFAULT 0,
    "kg" REAL NOT NULL DEFAULT 0,
    "rate" REAL,
    "crateMarkaId" TEXT,
    "crateMarkaName" TEXT,
    "crateQty" REAL,
    "crateRate" REAL,
    "crateValue" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "arrival_item_arrivalId_fkey" FOREIGN KEY ("arrivalId") REFERENCES "arrival" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "arrival_charges" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "arrivalId" TEXT NOT NULL,
    "otherChargesId" TEXT NOT NULL,
    "onValue" REAL,
    "per" REAL,
    "atRate" REAL,
    "no" REAL,
    "plusMinus" TEXT NOT NULL DEFAULT '+',
    "amount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "arrival_charges_arrivalId_fkey" FOREIGN KEY ("arrivalId") REFERENCES "arrival" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "arrival_charges_otherChargesId_fkey" FOREIGN KEY ("otherChargesId") REFERENCES "other_charges_head" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_arrival_type" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purchaseType" TEXT NOT NULL DEFAULT 'partyStock',
    "vehicleNoByDefault" BOOLEAN NOT NULL DEFAULT true,
    "autoRoundOffAmount" BOOLEAN NOT NULL DEFAULT false,
    "askForAdditionalFields" BOOLEAN NOT NULL DEFAULT false,
    "requireForwardingAgent" BOOLEAN NOT NULL DEFAULT false,
    "requireBroker" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_arrival_type" ("askForAdditionalFields", "companyId", "createdAt", "id", "requireBroker", "requireForwardingAgent", "updatedAt") SELECT "askForAdditionalFields", "companyId", "createdAt", "id", "requireBroker", "requireForwardingAgent", "updatedAt" FROM "arrival_type";
DROP TABLE "arrival_type";
ALTER TABLE "new_arrival_type" RENAME TO "arrival_type";
CREATE INDEX "arrival_type_companyId_idx" ON "arrival_type"("companyId");
CREATE INDEX "arrival_type_name_idx" ON "arrival_type"("name");
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
    "storesCount" INTEGER NOT NULL DEFAULT 0,
    "quickSalesCount" INTEGER NOT NULL DEFAULT 0,
    "quickSaleItemsCount" INTEGER NOT NULL DEFAULT 0,
    "crateIssuesCount" INTEGER NOT NULL DEFAULT 0,
    "crateIssueItemsCount" INTEGER NOT NULL DEFAULT 0,
    "crateReceivesCount" INTEGER NOT NULL DEFAULT 0,
    "crateReceiveItemsCount" INTEGER NOT NULL DEFAULT 0,
    "vouchersCount" INTEGER NOT NULL DEFAULT 0,
    "voucherItemsCount" INTEGER NOT NULL DEFAULT 0,
    "voucherChargesCount" INTEGER NOT NULL DEFAULT 0,
    "otherChargesHeadsCount" INTEGER NOT NULL DEFAULT 0,
    "arrivalsCount" INTEGER NOT NULL DEFAULT 0,
    "arrivalItemsCount" INTEGER NOT NULL DEFAULT 0,
    "arrivalChargesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_backup_tracking" ("accountGroupsCount", "accountsCount", "arrivalTypesCount", "backupFileName", "backupLocation", "backupSize", "backupTimestamp", "companiesCount", "companyId", "crateIssueItemsCount", "crateIssuesCount", "crateMarkasCount", "crateReceiveItemsCount", "crateReceivesCount", "createdAt", "id", "itemsCount", "packingsCount", "quickSaleItemsCount", "quickSalesCount", "recordsBackedUp", "status", "storesCount", "voucherChargesCount", "voucherItemsCount", "vouchersCount") SELECT "accountGroupsCount", "accountsCount", "arrivalTypesCount", "backupFileName", "backupLocation", "backupSize", "backupTimestamp", "companiesCount", "companyId", "crateIssueItemsCount", "crateIssuesCount", "crateMarkasCount", "crateReceiveItemsCount", "crateReceivesCount", "createdAt", "id", "itemsCount", "packingsCount", "quickSaleItemsCount", "quickSalesCount", "recordsBackedUp", "status", "storesCount", "voucherChargesCount", "voucherItemsCount", "vouchersCount" FROM "backup_tracking";
DROP TABLE "backup_tracking";
ALTER TABLE "new_backup_tracking" RENAME TO "backup_tracking";
CREATE INDEX "backup_tracking_backupTimestamp_idx" ON "backup_tracking"("backupTimestamp");
CREATE INDEX "backup_tracking_companyId_idx" ON "backup_tracking"("companyId");
CREATE INDEX "backup_tracking_backupFileName_idx" ON "backup_tracking"("backupFileName");
CREATE TABLE "new_store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "address2" TEXT,
    "address3" TEXT,
    "contactNo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_store" ("companyId", "createdAt", "id", "updatedAt") SELECT "companyId", "createdAt", "id", "updatedAt" FROM "store";
DROP TABLE "store";
ALTER TABLE "new_store" RENAME TO "store";
CREATE INDEX "store_companyId_idx" ON "store"("companyId");
CREATE INDEX "store_name_idx" ON "store"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "other_charges_head_companyId_idx" ON "other_charges_head"("companyId");

-- CreateIndex
CREATE INDEX "other_charges_head_headingName_idx" ON "other_charges_head"("headingName");

-- CreateIndex
CREATE INDEX "arrival_companyId_idx" ON "arrival"("companyId");

-- CreateIndex
CREATE INDEX "arrival_date_idx" ON "arrival"("date");

-- CreateIndex
CREATE INDEX "arrival_arrivalTypeId_idx" ON "arrival"("arrivalTypeId");

-- CreateIndex
CREATE INDEX "arrival_partyId_idx" ON "arrival"("partyId");

-- CreateIndex
CREATE INDEX "arrival_storeId_idx" ON "arrival"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "arrival_companyId_voucherNo_key" ON "arrival"("companyId", "voucherNo");

-- CreateIndex
CREATE INDEX "arrival_item_arrivalId_idx" ON "arrival_item"("arrivalId");

-- CreateIndex
CREATE INDEX "arrival_item_itemId_idx" ON "arrival_item"("itemId");

-- CreateIndex
CREATE INDEX "arrival_charges_arrivalId_idx" ON "arrival_charges"("arrivalId");

-- CreateIndex
CREATE INDEX "arrival_charges_otherChargesId_idx" ON "arrival_charges"("otherChargesId");
