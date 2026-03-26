-- CreateTable
CREATE TABLE "quick_receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "quick_receipt_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quickReceiptId" TEXT NOT NULL,
    "receiptId" TEXT,
    "accountId" TEXT NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "paymentMode" TEXT,
    "dateOfTransaction" DATETIME,
    "accountNo" TEXT,
    "chequeNo" TEXT,
    "transactionId" TEXT,
    "upiId" TEXT,
    "bank" TEXT,
    "branch" TEXT,
    "ifscNo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quick_receipt_item_quickReceiptId_fkey" FOREIGN KEY ("quickReceiptId") REFERENCES "quick_receipt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quick_receipt_item_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quick_payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "quick_payment_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quickPaymentId" TEXT NOT NULL,
    "paymentId" TEXT,
    "accountId" TEXT NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "paymentMode" TEXT,
    "dateOfTransaction" DATETIME,
    "accountNo" TEXT,
    "chequeNo" TEXT,
    "transactionId" TEXT,
    "upiId" TEXT,
    "bank" TEXT,
    "branch" TEXT,
    "ifscNo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quick_payment_item_quickPaymentId_fkey" FOREIGN KEY ("quickPaymentId") REFERENCES "quick_payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quick_payment_item_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_backup_tracking" ("accountGroupsCount", "accountsCount", "arrivalChargesCount", "arrivalItemsCount", "arrivalTypesCount", "arrivalsCount", "backupFileName", "backupLocation", "backupSize", "backupTimestamp", "companiesCount", "companyId", "crateIssueItemsCount", "crateIssuesCount", "crateMarkasCount", "crateReceiveItemsCount", "crateReceivesCount", "createdAt", "id", "itemsCount", "otherChargesHeadsCount", "packingsCount", "quickSaleItemsCount", "quickSalesCount", "recordsBackedUp", "sellerBillChargesCount", "sellerBillItemsCount", "sellerBillsCount", "status", "stockLedgersCount", "stockSaleItemsCount", "stockSalesCount", "stockTransferChargesCount", "stockTransferItemsCount", "stockTransferWattakLedgersCount", "stockTransfersCount", "stockWattakChargesCount", "stockWattakItemsCount", "stockWattaksCount", "storesCount", "voucherChargesCount", "voucherItemsCount", "vouchersCount") SELECT "accountGroupsCount", "accountsCount", "arrivalChargesCount", "arrivalItemsCount", "arrivalTypesCount", "arrivalsCount", "backupFileName", "backupLocation", "backupSize", "backupTimestamp", "companiesCount", "companyId", "crateIssueItemsCount", "crateIssuesCount", "crateMarkasCount", "crateReceiveItemsCount", "crateReceivesCount", "createdAt", "id", "itemsCount", "otherChargesHeadsCount", "packingsCount", "quickSaleItemsCount", "quickSalesCount", "recordsBackedUp", "sellerBillChargesCount", "sellerBillItemsCount", "sellerBillsCount", "status", "stockLedgersCount", "stockSaleItemsCount", "stockSalesCount", "stockTransferChargesCount", "stockTransferItemsCount", "stockTransferWattakLedgersCount", "stockTransfersCount", "stockWattakChargesCount", "stockWattakItemsCount", "stockWattaksCount", "storesCount", "voucherChargesCount", "voucherItemsCount", "vouchersCount" FROM "backup_tracking";
DROP TABLE "backup_tracking";
ALTER TABLE "new_backup_tracking" RENAME TO "backup_tracking";
CREATE INDEX "backup_tracking_backupTimestamp_idx" ON "backup_tracking"("backupTimestamp");
CREATE INDEX "backup_tracking_companyId_idx" ON "backup_tracking"("companyId");
CREATE INDEX "backup_tracking_backupFileName_idx" ON "backup_tracking"("backupFileName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "quick_receipt_companyId_idx" ON "quick_receipt"("companyId");

-- CreateIndex
CREATE INDEX "quick_receipt_item_quickReceiptId_idx" ON "quick_receipt_item"("quickReceiptId");

-- CreateIndex
CREATE INDEX "quick_receipt_item_accountId_idx" ON "quick_receipt_item"("accountId");

-- CreateIndex
CREATE INDEX "quick_payment_companyId_idx" ON "quick_payment"("companyId");

-- CreateIndex
CREATE INDEX "quick_payment_item_quickPaymentId_idx" ON "quick_payment_item"("quickPaymentId");

-- CreateIndex
CREATE INDEX "quick_payment_item_accountId_idx" ON "quick_payment_item"("accountId");
