-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_seller_bill_charge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerBillId" TEXT NOT NULL,
    "otherChargesId" TEXT NOT NULL,
    "arrivalChargeId" TEXT,
    "onValue" REAL,
    "per" REAL,
    "atRate" REAL,
    "no" REAL,
    "plusMinus" TEXT NOT NULL DEFAULT '+',
    "amount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "seller_bill_charge_sellerBillId_fkey" FOREIGN KEY ("sellerBillId") REFERENCES "seller_bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seller_bill_charge_otherChargesId_fkey" FOREIGN KEY ("otherChargesId") REFERENCES "other_charges_head" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "seller_bill_charge_arrivalChargeId_fkey" FOREIGN KEY ("arrivalChargeId") REFERENCES "arrival_charges" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_seller_bill_charge" (
    "id",
    "sellerBillId",
    "otherChargesId",
    "arrivalChargeId",
    "onValue",
    "per",
    "atRate",
    "no",
    "plusMinus",
    "amount",
    "createdAt",
    "updatedAt"
) SELECT
    "id",
    "sellerBillId",
    "otherChargesId",
    NULL,
    "onValue",
    "per",
    "atRate",
    "no",
    "plusMinus",
    "amount",
    "createdAt",
    "updatedAt"
FROM "seller_bill_charge";
DROP TABLE "seller_bill_charge";
ALTER TABLE "new_seller_bill_charge" RENAME TO "seller_bill_charge";
CREATE INDEX "seller_bill_charge_sellerBillId_idx" ON "seller_bill_charge"("sellerBillId");
CREATE INDEX "seller_bill_charge_otherChargesId_idx" ON "seller_bill_charge"("otherChargesId");
CREATE UNIQUE INDEX "seller_bill_charge_arrivalChargeId_key" ON "seller_bill_charge"("arrivalChargeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
