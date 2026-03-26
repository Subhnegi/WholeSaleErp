-- CreateTable
CREATE TABLE "stock_transfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "vchNo" TEXT NOT NULL,
    "vehicleNo" TEXT,
    "challanNo" TEXT,
    "remarks" TEXT,
    "driverName" TEXT,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "freightAmount" REAL NOT NULL DEFAULT 0,
    "advanceAmount" REAL NOT NULL DEFAULT 0,
    "totalOurCost" REAL NOT NULL DEFAULT 0,
    "totalNug" REAL NOT NULL DEFAULT 0,
    "totalWt" REAL NOT NULL DEFAULT 0,
    "basicAmount" REAL NOT NULL DEFAULT 0,
    "totalCharges" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "stock_transfer_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_transfer_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockTransferId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotNo" TEXT,
    "nug" REAL NOT NULL DEFAULT 0,
    "kg" REAL NOT NULL DEFAULT 0,
    "rate" REAL NOT NULL DEFAULT 0,
    "per" TEXT NOT NULL DEFAULT 'nug',
    "basicAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "stock_transfer_item_stockTransferId_fkey" FOREIGN KEY ("stockTransferId") REFERENCES "stock_transfer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_transfer_item_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_transfer_charge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockTransferId" TEXT NOT NULL,
    "otherChargesId" TEXT NOT NULL,
    "onValue" REAL,
    "per" REAL,
    "atRate" REAL,
    "no" REAL,
    "plusMinus" TEXT NOT NULL DEFAULT '+',
    "amount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "stock_transfer_charge_stockTransferId_fkey" FOREIGN KEY ("stockTransferId") REFERENCES "stock_transfer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_transfer_charge_otherChargesId_fkey" FOREIGN KEY ("otherChargesId") REFERENCES "other_charges_head" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "stock_transfer_companyId_idx" ON "stock_transfer"("companyId");

-- CreateIndex
CREATE INDEX "stock_transfer_accountId_idx" ON "stock_transfer"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfer_companyId_vchNo_key" ON "stock_transfer"("companyId", "vchNo");

-- CreateIndex
CREATE INDEX "stock_transfer_item_stockTransferId_idx" ON "stock_transfer_item"("stockTransferId");

-- CreateIndex
CREATE INDEX "stock_transfer_item_itemId_idx" ON "stock_transfer_item"("itemId");

-- CreateIndex
CREATE INDEX "stock_transfer_charge_stockTransferId_idx" ON "stock_transfer_charge"("stockTransferId");

-- CreateIndex
CREATE INDEX "stock_transfer_charge_otherChargesId_idx" ON "stock_transfer_charge"("otherChargesId");
