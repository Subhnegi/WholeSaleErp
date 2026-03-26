/*
  Warnings:

  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `lastSyncedAt` on the `account_groups` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `account_groups` table. All the data in the column will be lost.
  - You are about to drop the column `lastSyncedAt` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `lastSyncedAt` on the `arrival_type` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `arrival_type` table. All the data in the column will be lost.
  - You are about to drop the column `lastSyncedAt` on the `crate_marka` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `crate_marka` table. All the data in the column will be lost.
  - You are about to drop the column `lastSyncedAt` on the `packing` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `packing` table. All the data in the column will be lost.
  - You are about to drop the column `lastSyncedAt` on the `store` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `store` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Items_itemName_idx";

-- DropIndex
DROP INDEX "Items_companyId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Company";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Items";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "printName" TEXT,
    "printNameLang" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "countryCode" TEXT,
    "mobile1" TEXT,
    "mobile2" TEXT,
    "email" TEXT,
    "website" TEXT,
    "contactPerson" TEXT,
    "billTitle" TEXT,
    "userId" TEXT NOT NULL,
    "companyPassword" TEXT,
    "fyStartDate" TEXT NOT NULL,
    "fyEndDate" TEXT NOT NULL,
    "fyLabel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "quick_sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "saleDate" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalCrates" REAL NOT NULL DEFAULT 0,
    "totalNug" REAL NOT NULL DEFAULT 0,
    "totalWeight" REAL NOT NULL DEFAULT 0,
    "basicAmount" REAL NOT NULL DEFAULT 0,
    "commissionExpenses" REAL NOT NULL DEFAULT 0,
    "totalSaleAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "quick_sale_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quickSaleId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "nug" REAL NOT NULL DEFAULT 0,
    "kg" REAL NOT NULL DEFAULT 0,
    "rate" REAL NOT NULL DEFAULT 0,
    "per" TEXT NOT NULL DEFAULT 'nug',
    "basicAmount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "commission" REAL NOT NULL DEFAULT 0,
    "commissionPer" REAL NOT NULL DEFAULT 0,
    "marketFees" REAL NOT NULL DEFAULT 0,
    "rdf" REAL NOT NULL DEFAULT 0,
    "bardana" REAL NOT NULL DEFAULT 0,
    "bardanaAt" REAL NOT NULL DEFAULT 0,
    "laga" REAL NOT NULL DEFAULT 0,
    "lagaAt" REAL NOT NULL DEFAULT 0,
    "crateMarkaId" TEXT,
    "crateMarkaName" TEXT,
    "crateQty" REAL,
    "crateRate" REAL,
    "crateValue" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quick_sale_item_quickSaleId_fkey" FOREIGN KEY ("quickSaleId") REFERENCES "quick_sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "voucher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "voucherDate" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalNug" REAL NOT NULL DEFAULT 0,
    "totalWeight" REAL NOT NULL DEFAULT 0,
    "totalBasicAmount" REAL NOT NULL DEFAULT 0,
    "expenseAmount" REAL NOT NULL DEFAULT 0,
    "commissionAmount" REAL NOT NULL DEFAULT 0,
    "buyersAmount" REAL NOT NULL DEFAULT 0,
    "sellersItemValue" REAL NOT NULL DEFAULT 0,
    "totalOtherCharges" REAL NOT NULL DEFAULT 0,
    "transport" REAL NOT NULL DEFAULT 0,
    "freight" REAL NOT NULL DEFAULT 0,
    "grRrNo" TEXT,
    "narration" TEXT,
    "vehicleNo" TEXT,
    "advancePayment" REAL NOT NULL DEFAULT 0,
    "roundoff" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "voucher_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "netRate" BOOLEAN NOT NULL DEFAULT false,
    "nug" REAL NOT NULL DEFAULT 0,
    "weight" REAL NOT NULL DEFAULT 0,
    "customerPrice" REAL NOT NULL DEFAULT 0,
    "supplierPrice" REAL NOT NULL DEFAULT 0,
    "per" TEXT NOT NULL DEFAULT 'nug',
    "basicAmount" REAL NOT NULL DEFAULT 0,
    "netAmount" REAL NOT NULL DEFAULT 0,
    "commission" REAL NOT NULL DEFAULT 0,
    "commissionPer" REAL NOT NULL DEFAULT 0,
    "marketFees" REAL NOT NULL DEFAULT 0,
    "rdf" REAL NOT NULL DEFAULT 0,
    "bardana" REAL NOT NULL DEFAULT 0,
    "bardanaAt" REAL NOT NULL DEFAULT 0,
    "laga" REAL NOT NULL DEFAULT 0,
    "lagaAt" REAL NOT NULL DEFAULT 0,
    "crateMarkaId" TEXT,
    "crateMarkaName" TEXT,
    "crateQty" REAL,
    "crateRate" REAL,
    "crateValue" REAL,
    "sellerItemValue" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "voucher_item_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "voucher" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "voucher_charge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherId" TEXT NOT NULL,
    "chargeName" TEXT NOT NULL,
    "onValue" REAL NOT NULL DEFAULT 0,
    "atRate" REAL NOT NULL DEFAULT 0,
    "plusMinus" TEXT NOT NULL DEFAULT '+',
    "amount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "voucher_charge_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "voucher" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_account_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "parentGroupId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "account_groups_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "account_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_account_groups" ("companyId", "createdAt", "id", "level", "name", "parentGroupId", "updatedAt") SELECT "companyId", "createdAt", "id", "level", "name", "parentGroupId", "updatedAt" FROM "account_groups";
DROP TABLE "account_groups";
ALTER TABLE "new_account_groups" RENAME TO "account_groups";
CREATE INDEX "account_groups_companyId_idx" ON "account_groups"("companyId");
CREATE INDEX "account_groups_parentGroupId_idx" ON "account_groups"("parentGroupId");
CREATE TABLE "new_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountName" TEXT NOT NULL,
    "code" TEXT,
    "accountGroupId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "openingBalance" REAL NOT NULL DEFAULT 0,
    "drCr" TEXT NOT NULL DEFAULT 'Dr',
    "area" TEXT,
    "srNo" TEXT,
    "crLimit" REAL,
    "nameLang" TEXT,
    "address" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "panNo" TEXT,
    "mobile1" TEXT,
    "mobile2" TEXT,
    "bankName1" TEXT,
    "accountNo1" TEXT,
    "bankName2" TEXT,
    "accountNo2" TEXT,
    "contactPerson" TEXT,
    "ledgerFolioNo" TEXT,
    "auditUpto" TEXT,
    "maintainBillByBillBalance" BOOLEAN NOT NULL DEFAULT false,
    "photo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "accounts_accountGroupId_fkey" FOREIGN KEY ("accountGroupId") REFERENCES "account_groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_accounts" ("accountGroupId", "accountName", "accountNo1", "accountNo2", "address", "address2", "area", "auditUpto", "bankName1", "bankName2", "city", "code", "companyId", "contactPerson", "crLimit", "createdAt", "drCr", "id", "ledgerFolioNo", "maintainBillByBillBalance", "mobile1", "mobile2", "nameLang", "openingBalance", "panNo", "photo", "srNo", "state", "updatedAt") SELECT "accountGroupId", "accountName", "accountNo1", "accountNo2", "address", "address2", "area", "auditUpto", "bankName1", "bankName2", "city", "code", "companyId", "contactPerson", "crLimit", "createdAt", "drCr", "id", "ledgerFolioNo", "maintainBillByBillBalance", "mobile1", "mobile2", "nameLang", "openingBalance", "panNo", "photo", "srNo", "state", "updatedAt" FROM "accounts";
DROP TABLE "accounts";
ALTER TABLE "new_accounts" RENAME TO "accounts";
CREATE INDEX "accounts_companyId_idx" ON "accounts"("companyId");
CREATE INDEX "accounts_accountGroupId_idx" ON "accounts"("accountGroupId");
CREATE INDEX "accounts_accountName_idx" ON "accounts"("accountName");
CREATE TABLE "new_arrival_type" (
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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_arrival_type" ("arrivalTypeName", "askForAdditionalFields", "autoRoundoffAmount", "companyId", "createdAt", "id", "partyStock", "requireBroker", "requireForwardingAgent", "selfPurchase", "updatedAt", "vehicleNo") SELECT "arrivalTypeName", "askForAdditionalFields", "autoRoundoffAmount", "companyId", "createdAt", "id", "partyStock", "requireBroker", "requireForwardingAgent", "selfPurchase", "updatedAt", "vehicleNo" FROM "arrival_type";
DROP TABLE "arrival_type";
ALTER TABLE "new_arrival_type" RENAME TO "arrival_type";
CREATE INDEX "arrival_type_companyId_idx" ON "arrival_type"("companyId");
CREATE INDEX "arrival_type_arrivalTypeName_idx" ON "arrival_type"("arrivalTypeName");
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
    "vouchersCount" INTEGER NOT NULL DEFAULT 0,
    "voucherItemsCount" INTEGER NOT NULL DEFAULT 0,
    "voucherChargesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_backup_tracking" ("accountGroupsCount", "accountsCount", "arrivalTypesCount", "backupFileName", "backupLocation", "backupSize", "backupTimestamp", "companiesCount", "companyId", "crateMarkasCount", "createdAt", "id", "itemsCount", "packingsCount", "quickSaleItemsCount", "quickSalesCount", "recordsBackedUp", "status") SELECT "accountGroupsCount", "accountsCount", "arrivalTypesCount", "backupFileName", "backupLocation", "backupSize", "backupTimestamp", "companiesCount", "companyId", "crateMarkasCount", "createdAt", "id", "itemsCount", "packingsCount", "quickSaleItemsCount", "quickSalesCount", "recordsBackedUp", "status" FROM "backup_tracking";
DROP TABLE "backup_tracking";
ALTER TABLE "new_backup_tracking" RENAME TO "backup_tracking";
CREATE INDEX "backup_tracking_backupTimestamp_idx" ON "backup_tracking"("backupTimestamp");
CREATE INDEX "backup_tracking_companyId_idx" ON "backup_tracking"("companyId");
CREATE INDEX "backup_tracking_backupFileName_idx" ON "backup_tracking"("backupFileName");
CREATE TABLE "new_crate_marka" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "crateMarkaName" TEXT NOT NULL,
    "printAs" TEXT,
    "opQty" REAL NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_crate_marka" ("companyId", "cost", "crateMarkaName", "createdAt", "id", "opQty", "printAs", "updatedAt") SELECT "companyId", "cost", "crateMarkaName", "createdAt", "id", "opQty", "printAs", "updatedAt" FROM "crate_marka";
DROP TABLE "crate_marka";
ALTER TABLE "new_crate_marka" RENAME TO "crate_marka";
CREATE INDEX "crate_marka_companyId_idx" ON "crate_marka"("companyId");
CREATE INDEX "crate_marka_crateMarkaName_idx" ON "crate_marka"("crateMarkaName");
CREATE TABLE "new_packing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packingName" TEXT NOT NULL,
    "calculate" TEXT NOT NULL,
    "divideBy" REAL NOT NULL DEFAULT 1,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_packing" ("calculate", "companyId", "createdAt", "divideBy", "id", "packingName", "updatedAt") SELECT "calculate", "companyId", "createdAt", "divideBy", "id", "packingName", "updatedAt" FROM "packing";
DROP TABLE "packing";
ALTER TABLE "new_packing" RENAME TO "packing";
CREATE INDEX "packing_companyId_idx" ON "packing"("companyId");
CREATE INDEX "packing_packingName_idx" ON "packing"("packingName");
CREATE TABLE "new_store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeName" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_store" ("companyId", "createdAt", "id", "storeName", "updatedAt") SELECT "companyId", "createdAt", "id", "storeName", "updatedAt" FROM "store";
DROP TABLE "store";
ALTER TABLE "new_store" RENAME TO "store";
CREATE INDEX "store_companyId_idx" ON "store"("companyId");
CREATE INDEX "store_storeName_idx" ON "store"("storeName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "items_companyId_idx" ON "items"("companyId");

-- CreateIndex
CREATE INDEX "items_itemName_idx" ON "items"("itemName");

-- CreateIndex
CREATE INDEX "quick_sale_companyId_idx" ON "quick_sale"("companyId");

-- CreateIndex
CREATE INDEX "quick_sale_saleDate_idx" ON "quick_sale"("saleDate");

-- CreateIndex
CREATE INDEX "quick_sale_item_quickSaleId_idx" ON "quick_sale_item"("quickSaleId");

-- CreateIndex
CREATE INDEX "quick_sale_item_itemId_idx" ON "quick_sale_item"("itemId");

-- CreateIndex
CREATE INDEX "quick_sale_item_accountId_idx" ON "quick_sale_item"("accountId");

-- CreateIndex
CREATE INDEX "voucher_companyId_idx" ON "voucher"("companyId");

-- CreateIndex
CREATE INDEX "voucher_voucherDate_idx" ON "voucher"("voucherDate");

-- CreateIndex
CREATE INDEX "voucher_supplierId_idx" ON "voucher"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_companyId_voucherNo_key" ON "voucher"("companyId", "voucherNo");

-- CreateIndex
CREATE INDEX "voucher_item_voucherId_idx" ON "voucher_item"("voucherId");

-- CreateIndex
CREATE INDEX "voucher_item_itemId_idx" ON "voucher_item"("itemId");

-- CreateIndex
CREATE INDEX "voucher_item_customerId_idx" ON "voucher_item"("customerId");

-- CreateIndex
CREATE INDEX "voucher_charge_voucherId_idx" ON "voucher_charge"("voucherId");
