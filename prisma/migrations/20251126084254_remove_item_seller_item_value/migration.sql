/*
  Warnings:

  - You are about to drop the column `sellerItemValue` on the `voucher_item` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_voucher_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "netRate" BOOLEAN NOT NULL DEFAULT false,
    "nug" REAL NOT NULL DEFAULT 0,
    "weight" REAL NOT NULL DEFAULT 0,
    "customerPrice" REAL NOT NULL DEFAULT 0,
    "supplierPrice" REAL NOT NULL DEFAULT 0,
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
    CONSTRAINT "voucher_item_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "voucher" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_voucher_item" ("bardana", "bardanaAt", "basicAmount", "commission", "commissionPer", "crateMarkaId", "crateMarkaName", "crateQty", "crateRate", "crateValue", "createdAt", "customerId", "customerName", "customerPrice", "id", "itemId", "itemName", "laga", "lagaAt", "marketFees", "netAmount", "netRate", "nug", "per", "rdf", "supplierPrice", "updatedAt", "voucherId", "weight") SELECT "bardana", "bardanaAt", "basicAmount", "commission", "commissionPer", "crateMarkaId", "crateMarkaName", "crateQty", "crateRate", "crateValue", "createdAt", "customerId", "customerName", "customerPrice", "id", "itemId", "itemName", "laga", "lagaAt", "marketFees", "netAmount", "netRate", "nug", "per", "rdf", "supplierPrice", "updatedAt", "voucherId", "weight" FROM "voucher_item";
DROP TABLE "voucher_item";
ALTER TABLE "new_voucher_item" RENAME TO "voucher_item";
CREATE INDEX "voucher_item_voucherId_idx" ON "voucher_item"("voucherId");
CREATE INDEX "voucher_item_itemId_idx" ON "voucher_item"("itemId");
CREATE INDEX "voucher_item_customerId_idx" ON "voucher_item"("customerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
