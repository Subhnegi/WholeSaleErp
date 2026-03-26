-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_seller_bill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "vchNo" TEXT NOT NULL,
    "mode" TEXT,
    "vehicleNo" TEXT,
    "stockSaleId" TEXT,
    "totalNug" REAL NOT NULL DEFAULT 0,
    "totalKg" REAL NOT NULL DEFAULT 0,
    "basicAmount" REAL NOT NULL DEFAULT 0,
    "arrivalExpenses" REAL NOT NULL DEFAULT 0,
    "charges" REAL NOT NULL DEFAULT 0,
    "roundOff" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "seller_bill_stockSaleId_fkey" FOREIGN KEY ("stockSaleId") REFERENCES "stock_sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "seller_bill_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_seller_bill" ("accountId", "arrivalExpenses", "basicAmount", "charges", "companyId", "createdAt", "id", "mode", "stockSaleId", "totalKg", "totalNug", "updatedAt", "vchNo", "vehicleNo") SELECT "accountId", "arrivalExpenses", "basicAmount", "charges", "companyId", "createdAt", "id", "mode", "stockSaleId", "totalKg", "totalNug", "updatedAt", "vchNo", "vehicleNo" FROM "seller_bill";
DROP TABLE "seller_bill";
ALTER TABLE "new_seller_bill" RENAME TO "seller_bill";
CREATE INDEX "seller_bill_companyId_idx" ON "seller_bill"("companyId");
CREATE INDEX "seller_bill_accountId_idx" ON "seller_bill"("accountId");
CREATE INDEX "seller_bill_stockSaleId_idx" ON "seller_bill"("stockSaleId");
CREATE UNIQUE INDEX "seller_bill_companyId_vchNo_key" ON "seller_bill"("companyId", "vchNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
