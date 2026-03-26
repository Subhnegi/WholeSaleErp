/*
  Warnings:

  - Made the column `id` on table `stock_ledger` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_stock_ledger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotNoVariety" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "storeId" TEXT,
    "totalNug" REAL NOT NULL DEFAULT 0,
    "totalKg" REAL NOT NULL DEFAULT 0,
    "soldNug" REAL NOT NULL DEFAULT 0,
    "soldKg" REAL NOT NULL DEFAULT 0,
    "availableNug" REAL NOT NULL DEFAULT 0,
    "availableKg" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_stock_ledger" ("availableKg", "availableNug", "companyId", "createdAt", "id", "itemId", "lotNoVariety", "soldKg", "soldNug", "storeId", "supplierId", "totalKg", "totalNug", "updatedAt") SELECT "availableKg", "availableNug", "companyId", "createdAt", "id", "itemId", "lotNoVariety", "soldKg", "soldNug", "storeId", "supplierId", "totalKg", "totalNug", "updatedAt" FROM "stock_ledger";
DROP TABLE "stock_ledger";
ALTER TABLE "new_stock_ledger" RENAME TO "stock_ledger";
CREATE INDEX "stock_ledger_companyId_idx" ON "stock_ledger"("companyId");
CREATE INDEX "stock_ledger_supplierId_idx" ON "stock_ledger"("supplierId");
CREATE INDEX "stock_ledger_itemId_idx" ON "stock_ledger"("itemId");
CREATE INDEX "stock_ledger_storeId_idx" ON "stock_ledger"("storeId");
CREATE INDEX "stock_ledger_availableNug_idx" ON "stock_ledger"("availableNug");
CREATE UNIQUE INDEX "stock_ledger_companyId_itemId_lotNoVariety_supplierId_storeId_key" ON "stock_ledger"("companyId", "itemId", "lotNoVariety", "supplierId", "storeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
