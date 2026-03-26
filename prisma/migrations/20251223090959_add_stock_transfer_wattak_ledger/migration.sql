-- CreateTable
CREATE TABLE "stock_transfer_wattak_ledger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "stockTransferId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotNo" TEXT,
    "transferredNug" REAL NOT NULL DEFAULT 0,
    "transferredWt" REAL NOT NULL DEFAULT 0,
    "billedNug" REAL NOT NULL DEFAULT 0,
    "billedWt" REAL NOT NULL DEFAULT 0,
    "remainingNug" REAL NOT NULL DEFAULT 0,
    "remainingWt" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "stock_transfer_wattak_ledger_stockTransferId_fkey" FOREIGN KEY ("stockTransferId") REFERENCES "stock_transfer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_transfer_wattak_ledger_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "stock_transfer_wattak_ledger_companyId_idx" ON "stock_transfer_wattak_ledger"("companyId");

-- CreateIndex
CREATE INDEX "stock_transfer_wattak_ledger_stockTransferId_idx" ON "stock_transfer_wattak_ledger"("stockTransferId");

-- CreateIndex
CREATE INDEX "stock_transfer_wattak_ledger_itemId_idx" ON "stock_transfer_wattak_ledger"("itemId");

-- CreateIndex
CREATE INDEX "stock_transfer_wattak_ledger_remainingNug_idx" ON "stock_transfer_wattak_ledger"("remainingNug");

-- CreateIndex
CREATE INDEX "stock_transfer_wattak_ledger_remainingWt_idx" ON "stock_transfer_wattak_ledger"("remainingWt");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfer_wattak_ledger_stockTransferId_itemId_lotNo_key" ON "stock_transfer_wattak_ledger"("stockTransferId", "itemId", "lotNo");
