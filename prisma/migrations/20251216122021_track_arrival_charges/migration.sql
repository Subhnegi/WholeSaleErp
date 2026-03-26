-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_seller_bill_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerBillId" TEXT NOT NULL,
    "stockSaleItemId" TEXT,
    "itemId" TEXT NOT NULL,
    "lotNo" TEXT,
    "nug" REAL NOT NULL DEFAULT 0,
    "kg" REAL NOT NULL DEFAULT 0,
    "rate" REAL NOT NULL DEFAULT 0,
    "per" TEXT NOT NULL DEFAULT 'nug',
    "amount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "seller_bill_item_sellerBillId_fkey" FOREIGN KEY ("sellerBillId") REFERENCES "seller_bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seller_bill_item_stockSaleItemId_fkey" FOREIGN KEY ("stockSaleItemId") REFERENCES "stock_sale_item" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_seller_bill_item" ("amount", "createdAt", "id", "itemId", "kg", "lotNo", "nug", "per", "rate", "sellerBillId", "stockSaleItemId", "updatedAt") SELECT "amount", "createdAt", "id", "itemId", "kg", "lotNo", "nug", "per", "rate", "sellerBillId", "stockSaleItemId", "updatedAt" FROM "seller_bill_item";
DROP TABLE "seller_bill_item";
ALTER TABLE "new_seller_bill_item" RENAME TO "seller_bill_item";
CREATE UNIQUE INDEX "seller_bill_item_stockSaleItemId_key" ON "seller_bill_item"("stockSaleItemId");
CREATE INDEX "seller_bill_item_sellerBillId_idx" ON "seller_bill_item"("sellerBillId");
CREATE INDEX "seller_bill_item_itemId_idx" ON "seller_bill_item"("itemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
