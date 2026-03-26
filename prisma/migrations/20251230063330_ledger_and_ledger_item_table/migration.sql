-- CreateTable
CREATE TABLE "account_ledger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "totalDr" REAL NOT NULL DEFAULT 0,
    "totalCr" REAL NOT NULL DEFAULT 0,
    "balance" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "account_ledger_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "account_ledger_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "account_ledger_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountLedgerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "vchNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "particulars" TEXT NOT NULL,
    "debit" REAL NOT NULL DEFAULT 0,
    "credit" REAL NOT NULL DEFAULT 0,
    "balance" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "account_ledger_item_accountLedgerId_fkey" FOREIGN KEY ("accountLedgerId") REFERENCES "account_ledger" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "quickReceiptsCount" INTEGER NOT NULL DEFAULT 0,
    "quickReceiptItemsCount" INTEGER NOT NULL DEFAULT 0,
    "quickPaymentsCount" INTEGER NOT NULL DEFAULT 0,
    "quickPaymentItemsCount" INTEGER NOT NULL DEFAULT 0,
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
    "stockTransfersCount" INTEGER NOT NULL DEFAULT 0,
    "stockTransferItemsCount" INTEGER NOT NULL DEFAULT 0,
    "stockTransferChargesCount" INTEGER NOT NULL DEFAULT 0,
    "stockWattaksCount" INTEGER NOT NULL DEFAULT 0,
    "stockWattakItemsCount" INTEGER NOT NULL DEFAULT 0,
    "stockWattakChargesCount" INTEGER NOT NULL DEFAULT 0,
    "stockTransferWattakLedgersCount" INTEGER NOT NULL DEFAULT 0,
    "accountLedgersCount" INTEGER NOT NULL DEFAULT 0,
    "accountLedgerItemsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_backup_tracking" ("accountGroupsCount", "accountsCount", "arrivalChargesCount", "arrivalItemsCount", "arrivalTypesCount", "arrivalsCount", "backupFileName", "backupLocation", "backupSize", "backupTimestamp", "companiesCount", "companyId", "crateIssueItemsCount", "crateIssuesCount", "crateMarkasCount", "crateReceiveItemsCount", "crateReceivesCount", "createdAt", "id", "itemsCount", "otherChargesHeadsCount", "packingsCount", "quickPaymentItemsCount", "quickPaymentsCount", "quickReceiptItemsCount", "quickReceiptsCount", "quickSaleItemsCount", "quickSalesCount", "recordsBackedUp", "sellerBillChargesCount", "sellerBillItemsCount", "sellerBillsCount", "status", "stockLedgersCount", "stockSaleItemsCount", "stockSalesCount", "stockTransferChargesCount", "stockTransferItemsCount", "stockTransferWattakLedgersCount", "stockTransfersCount", "stockWattakChargesCount", "stockWattakItemsCount", "stockWattaksCount", "storesCount", "voucherChargesCount", "voucherItemsCount", "vouchersCount") SELECT "accountGroupsCount", "accountsCount", "arrivalChargesCount", "arrivalItemsCount", "arrivalTypesCount", "arrivalsCount", "backupFileName", "backupLocation", "backupSize", "backupTimestamp", "companiesCount", "companyId", "crateIssueItemsCount", "crateIssuesCount", "crateMarkasCount", "crateReceiveItemsCount", "crateReceivesCount", "createdAt", "id", "itemsCount", "otherChargesHeadsCount", "packingsCount", "quickPaymentItemsCount", "quickPaymentsCount", "quickReceiptItemsCount", "quickReceiptsCount", "quickSaleItemsCount", "quickSalesCount", "recordsBackedUp", "sellerBillChargesCount", "sellerBillItemsCount", "sellerBillsCount", "status", "stockLedgersCount", "stockSaleItemsCount", "stockSalesCount", "stockTransferChargesCount", "stockTransferItemsCount", "stockTransferWattakLedgersCount", "stockTransfersCount", "stockWattakChargesCount", "stockWattakItemsCount", "stockWattaksCount", "storesCount", "voucherChargesCount", "voucherItemsCount", "vouchersCount" FROM "backup_tracking";
DROP TABLE "backup_tracking";
ALTER TABLE "new_backup_tracking" RENAME TO "backup_tracking";
CREATE INDEX "backup_tracking_backupTimestamp_idx" ON "backup_tracking"("backupTimestamp");
CREATE INDEX "backup_tracking_companyId_idx" ON "backup_tracking"("companyId");
CREATE INDEX "backup_tracking_backupFileName_idx" ON "backup_tracking"("backupFileName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "account_ledger_companyId_idx" ON "account_ledger"("companyId");

-- CreateIndex
CREATE INDEX "account_ledger_accountId_idx" ON "account_ledger"("accountId");

-- CreateIndex
CREATE INDEX "account_ledger_item_accountLedgerId_idx" ON "account_ledger_item"("accountLedgerId");
