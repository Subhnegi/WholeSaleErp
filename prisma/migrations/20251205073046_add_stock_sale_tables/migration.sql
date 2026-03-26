-- CreateTable
CREATE TABLE "stock_sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "saleDate" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierName" TEXT,
    "storeId" TEXT,
    "storeName" TEXT,
    "totalNug" REAL NOT NULL DEFAULT 0,
    "totalKg" REAL NOT NULL DEFAULT 0,
    "basicAmount" REAL NOT NULL DEFAULT 0,
    "supplierAmount" REAL NOT NULL DEFAULT 0,
    "customerAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "stock_sale_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockSaleId" TEXT NOT NULL,
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

-- CreateIndex
CREATE INDEX "stock_sale_companyId_idx" ON "stock_sale"("companyId");

-- CreateIndex
CREATE INDEX "stock_sale_supplierId_idx" ON "stock_sale"("supplierId");

-- CreateIndex
CREATE INDEX "stock_sale_storeId_idx" ON "stock_sale"("storeId");

-- CreateIndex
CREATE INDEX "stock_sale_saleDate_idx" ON "stock_sale"("saleDate");

-- CreateIndex
CREATE INDEX "stock_sale_item_stockSaleId_idx" ON "stock_sale_item"("stockSaleId");

-- CreateIndex
CREATE INDEX "stock_sale_item_itemId_idx" ON "stock_sale_item"("itemId");

-- CreateIndex
CREATE INDEX "stock_sale_item_customerId_idx" ON "stock_sale_item"("customerId");
