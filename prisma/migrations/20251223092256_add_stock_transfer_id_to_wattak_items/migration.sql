-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_stock_wattak_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockWattakId" TEXT NOT NULL,
    "stockTransferId" TEXT,
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
    CONSTRAINT "stock_wattak_item_stockTransferId_fkey" FOREIGN KEY ("stockTransferId") REFERENCES "stock_transfer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_wattak_item_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_stock_wattak_item" ("balanceNug", "basicAmount", "createdAt", "id", "issuedNug", "itemId", "lotNo", "nug", "per", "rate", "stockWattakId", "updatedAt", "wt") SELECT "balanceNug", "basicAmount", "createdAt", "id", "issuedNug", "itemId", "lotNo", "nug", "per", "rate", "stockWattakId", "updatedAt", "wt" FROM "stock_wattak_item";
DROP TABLE "stock_wattak_item";
ALTER TABLE "new_stock_wattak_item" RENAME TO "stock_wattak_item";
CREATE INDEX "stock_wattak_item_stockWattakId_idx" ON "stock_wattak_item"("stockWattakId");
CREATE INDEX "stock_wattak_item_stockTransferId_idx" ON "stock_wattak_item"("stockTransferId");
CREATE INDEX "stock_wattak_item_itemId_idx" ON "stock_wattak_item"("itemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
