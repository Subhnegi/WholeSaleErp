-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_stock_transfer_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockTransferId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotNo" TEXT,
    "nug" REAL NOT NULL DEFAULT 0,
    "kg" REAL NOT NULL DEFAULT 0,
    "rate" REAL NOT NULL DEFAULT 0,
    "ourRate" REAL NOT NULL DEFAULT 0,
    "per" TEXT NOT NULL DEFAULT 'nug',
    "basicAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "stock_transfer_item_stockTransferId_fkey" FOREIGN KEY ("stockTransferId") REFERENCES "stock_transfer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_transfer_item_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_stock_transfer_item" ("basicAmount", "createdAt", "id", "itemId", "kg", "lotNo", "nug", "per", "rate", "stockTransferId", "updatedAt") SELECT "basicAmount", "createdAt", "id", "itemId", "kg", "lotNo", "nug", "per", "rate", "stockTransferId", "updatedAt" FROM "stock_transfer_item";
DROP TABLE "stock_transfer_item";
ALTER TABLE "new_stock_transfer_item" RENAME TO "stock_transfer_item";
CREATE INDEX "stock_transfer_item_stockTransferId_idx" ON "stock_transfer_item"("stockTransferId");
CREATE INDEX "stock_transfer_item_itemId_idx" ON "stock_transfer_item"("itemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
