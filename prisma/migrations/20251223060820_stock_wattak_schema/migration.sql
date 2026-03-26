-- CreateTable
CREATE TABLE "stock_wattak" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "vchNo" TEXT NOT NULL,
    "vehicleNo" TEXT,
    "challanNo" TEXT,
    "totalNug" REAL NOT NULL DEFAULT 0,
    "totalWt" REAL NOT NULL DEFAULT 0,
    "basicAmount" REAL NOT NULL DEFAULT 0,
    "totalCharges" REAL NOT NULL DEFAULT 0,
    "roundOff" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "stock_wattak_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_wattak_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockWattakId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotNo" TEXT,
    "nug" REAL NOT NULL DEFAULT 0,
    "wt" REAL NOT NULL DEFAULT 0,
    "rate" REAL NOT NULL DEFAULT 0,
    "per" TEXT NOT NULL DEFAULT 'nug',
    "basicAmount" REAL NOT NULL DEFAULT 0,
    "issuedNug" REAL NOT NULL DEFAULT 0,
    "balanceNug" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "stock_wattak_item_stockWattakId_fkey" FOREIGN KEY ("stockWattakId") REFERENCES "stock_wattak" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_wattak_item_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_wattak_charge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockWattakId" TEXT NOT NULL,
    "otherChargesId" TEXT NOT NULL,
    "onValue" REAL,
    "per" REAL,
    "atRate" REAL,
    "no" REAL,
    "plusMinus" TEXT NOT NULL DEFAULT '+',
    "amount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "stock_wattak_charge_stockWattakId_fkey" FOREIGN KEY ("stockWattakId") REFERENCES "stock_wattak" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_wattak_charge_otherChargesId_fkey" FOREIGN KEY ("otherChargesId") REFERENCES "other_charges_head" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "stock_wattak_companyId_idx" ON "stock_wattak"("companyId");

-- CreateIndex
CREATE INDEX "stock_wattak_partyId_idx" ON "stock_wattak"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_wattak_companyId_vchNo_key" ON "stock_wattak"("companyId", "vchNo");

-- CreateIndex
CREATE INDEX "stock_wattak_item_stockWattakId_idx" ON "stock_wattak_item"("stockWattakId");

-- CreateIndex
CREATE INDEX "stock_wattak_item_itemId_idx" ON "stock_wattak_item"("itemId");

-- CreateIndex
CREATE INDEX "stock_wattak_charge_stockWattakId_idx" ON "stock_wattak_charge"("stockWattakId");

-- CreateIndex
CREATE INDEX "stock_wattak_charge_otherChargesId_idx" ON "stock_wattak_charge"("otherChargesId");
