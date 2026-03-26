-- CreateTable
CREATE TABLE "seller_bill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "vchNo" TEXT NOT NULL,
    "mode" TEXT,
    "stockSaleId" TEXT,
    "totalNug" REAL NOT NULL DEFAULT 0,
    "totalKg" REAL NOT NULL DEFAULT 0,
    "basicAmount" REAL NOT NULL DEFAULT 0,
    "arrivalExpenses" REAL NOT NULL DEFAULT 0,
    "charges" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "seller_bill_stockSaleId_fkey" FOREIGN KEY ("stockSaleId") REFERENCES "stock_sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "seller_bill_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "seller_bill_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerBillId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotNo" TEXT,
    "nug" REAL NOT NULL DEFAULT 0,
    "kg" REAL NOT NULL DEFAULT 0,
    "rate" REAL NOT NULL DEFAULT 0,
    "per" TEXT NOT NULL DEFAULT 'nug',
    "amount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "seller_bill_item_sellerBillId_fkey" FOREIGN KEY ("sellerBillId") REFERENCES "seller_bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "seller_bill_charge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerBillId" TEXT NOT NULL,
    "otherChargesId" TEXT NOT NULL,
    "onValue" REAL,
    "per" REAL,
    "atRate" REAL,
    "no" REAL,
    "plusMinus" TEXT NOT NULL DEFAULT '+',
    "amount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "seller_bill_charge_sellerBillId_fkey" FOREIGN KEY ("sellerBillId") REFERENCES "seller_bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seller_bill_charge_otherChargesId_fkey" FOREIGN KEY ("otherChargesId") REFERENCES "other_charges_head" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "stockSalesCount" INTEGER NOT NULL DEFAULT 0,
    "stockSaleItemsCount" INTEGER NOT NULL DEFAULT 0,
    "stockLedgersCount" INTEGER NOT NULL DEFAULT 0,
    "sellerBillsCount" INTEGER NOT NULL DEFAULT 0,
    "sellerBillItemsCount" INTEGER NOT NULL DEFAULT 0,
    "sellerBillChargesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_backup_tracking" ("accountGroupsCount", "accountsCount", "arrivalChargesCount", "arrivalItemsCount", "arrivalTypesCount", "arrivalsCount", "backupFileName", "backupLocation", "backupSize", "backupTimestamp", "companiesCount", "companyId", "crateIssueItemsCount", "crateIssuesCount", "crateMarkasCount", "crateReceiveItemsCount", "crateReceivesCount", "createdAt", "id", "itemsCount", "otherChargesHeadsCount", "packingsCount", "quickSaleItemsCount", "quickSalesCount", "recordsBackedUp", "status", "stockLedgersCount", "stockSaleItemsCount", "stockSalesCount", "storesCount", "voucherChargesCount", "voucherItemsCount", "vouchersCount") SELECT "accountGroupsCount", "accountsCount", "arrivalChargesCount", "arrivalItemsCount", "arrivalTypesCount", "arrivalsCount", "backupFileName", "backupLocation", "backupSize", "backupTimestamp", "companiesCount", "companyId", "crateIssueItemsCount", "crateIssuesCount", "crateMarkasCount", "crateReceiveItemsCount", "crateReceivesCount", "createdAt", "id", "itemsCount", "otherChargesHeadsCount", "packingsCount", "quickSaleItemsCount", "quickSalesCount", "recordsBackedUp", "status", "stockLedgersCount", "stockSaleItemsCount", "stockSalesCount", "storesCount", "voucherChargesCount", "voucherItemsCount", "vouchersCount" FROM "backup_tracking";
DROP TABLE "backup_tracking";
ALTER TABLE "new_backup_tracking" RENAME TO "backup_tracking";
CREATE INDEX "backup_tracking_backupTimestamp_idx" ON "backup_tracking"("backupTimestamp");
CREATE INDEX "backup_tracking_companyId_idx" ON "backup_tracking"("companyId");
CREATE INDEX "backup_tracking_backupFileName_idx" ON "backup_tracking"("backupFileName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "seller_bill_companyId_idx" ON "seller_bill"("companyId");

-- CreateIndex
CREATE INDEX "seller_bill_accountId_idx" ON "seller_bill"("accountId");

-- CreateIndex
CREATE INDEX "seller_bill_stockSaleId_idx" ON "seller_bill"("stockSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_bill_companyId_vchNo_key" ON "seller_bill"("companyId", "vchNo");

-- CreateIndex
CREATE INDEX "seller_bill_item_sellerBillId_idx" ON "seller_bill_item"("sellerBillId");

-- CreateIndex
CREATE INDEX "seller_bill_item_itemId_idx" ON "seller_bill_item"("itemId");

-- CreateIndex
CREATE INDEX "seller_bill_charge_sellerBillId_idx" ON "seller_bill_charge"("sellerBillId");

-- CreateIndex
CREATE INDEX "seller_bill_charge_otherChargesId_idx" ON "seller_bill_charge"("otherChargesId");
