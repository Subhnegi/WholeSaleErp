/*
  Warnings:

  - You are about to drop the column `storeId` on the `stock_sale` table. All the data in the column will be lost.
  - You are about to drop the column `storeName` on the `stock_sale` table. All the data in the column will be lost.
  - You are about to drop the column `supplierId` on the `stock_sale` table. All the data in the column will be lost.
  - You are about to drop the column `supplierName` on the `stock_sale` table. All the data in the column will be lost.
  - Added the required column `supplierId` to the `stock_sale_item` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Step 1: Create new stock_sale table without supplier/store fields
CREATE TABLE "new_stock_sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "saleDate" TEXT NOT NULL,
    "totalNug" REAL NOT NULL DEFAULT 0,
    "totalKg" REAL NOT NULL DEFAULT 0,
    "basicAmount" REAL NOT NULL DEFAULT 0,
    "supplierAmount" REAL NOT NULL DEFAULT 0,
    "customerAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Step 2: Copy data from old stock_sale (excluding supplier/store fields)
INSERT INTO "new_stock_sale" ("basicAmount", "companyId", "createdAt", "customerAmount", "id", "saleDate", "supplierAmount", "totalKg", "totalNug", "updatedAt") 
SELECT "basicAmount", "companyId", "createdAt", "customerAmount", "id", "saleDate", "supplierAmount", "totalKg", "totalNug", "updatedAt" FROM "stock_sale";

-- Step 3: Create new stock_sale_item table with supplier/store fields
CREATE TABLE "new_stock_sale_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockSaleId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierName" TEXT,
    "storeId" TEXT,
    "storeName" TEXT,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "lotNoVariety" TEXT,
    "nug" REAL NOT NULL DEFAULT 0,
    "kg" REAL NOT NULL DEFAULT 0,
    "rate" REAL NOT NULL DEFAULT 0,
    "customerRate" REAL NOT NULL DEFAULT 0,
    "supplierRate" REAL NOT NULL DEFAULT 0,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "stock_sale_item_stockSaleId_fkey" FOREIGN KEY ("stockSaleId") REFERENCES "stock_sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 4: Copy data from old stock_sale_item and JOIN with stock_sale to get supplier/store
INSERT INTO "new_stock_sale_item" (
    "id", "stockSaleId", "supplierId", "supplierName", "storeId", "storeName",
    "itemId", "itemName", "customerId", "customerName", "lotNoVariety",
    "nug", "kg", "rate", "customerRate", "supplierRate", "per",
    "basicAmount", "netAmount", "commission", "commissionPer",
    "marketFees", "rdf", "bardana", "bardanaAt", "laga", "lagaAt",
    "crateMarkaId", "crateMarkaName", "crateQty", "crateRate", "crateValue",
    "createdAt", "updatedAt"
)
SELECT 
    si."id", si."stockSaleId", 
    ss."supplierId", ss."supplierName", ss."storeId", ss."storeName",
    si."itemId", si."itemName", si."customerId", si."customerName", si."lotNoVariety",
    si."nug", si."kg", si."rate", si."customerRate", si."supplierRate", si."per",
    si."basicAmount", si."netAmount", si."commission", si."commissionPer",
    si."marketFees", si."rdf", si."bardana", si."bardanaAt", si."laga", si."lagaAt",
    si."crateMarkaId", si."crateMarkaName", si."crateQty", si."crateRate", si."crateValue",
    si."createdAt", si."updatedAt"
FROM "stock_sale_item" si
INNER JOIN "stock_sale" ss ON si."stockSaleId" = ss."id";

-- Step 5: Drop old tables and rename new ones
DROP TABLE "stock_sale_item";
DROP TABLE "stock_sale";
ALTER TABLE "new_stock_sale" RENAME TO "stock_sale";
ALTER TABLE "new_stock_sale_item" RENAME TO "stock_sale_item";

-- Step 6: Create indexes
CREATE INDEX "stock_sale_companyId_idx" ON "stock_sale"("companyId");
CREATE INDEX "stock_sale_saleDate_idx" ON "stock_sale"("saleDate");
CREATE INDEX "stock_sale_item_stockSaleId_idx" ON "stock_sale_item"("stockSaleId");
CREATE INDEX "stock_sale_item_supplierId_idx" ON "stock_sale_item"("supplierId");
CREATE INDEX "stock_sale_item_storeId_idx" ON "stock_sale_item"("storeId");
CREATE INDEX "stock_sale_item_itemId_idx" ON "stock_sale_item"("itemId");
CREATE INDEX "stock_sale_item_customerId_idx" ON "stock_sale_item"("customerId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
