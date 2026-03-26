-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_voucher_charge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherId" TEXT NOT NULL,
    "otherChargesId" TEXT,
    "chargeName" TEXT NOT NULL,
    "onValue" REAL NOT NULL DEFAULT 0,
    "per" REAL,
    "atRate" REAL NOT NULL DEFAULT 0,
    "no" REAL,
    "plusMinus" TEXT NOT NULL DEFAULT '+',
    "amount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "voucher_charge_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "voucher" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "voucher_charge_otherChargesId_fkey" FOREIGN KEY ("otherChargesId") REFERENCES "other_charges_head" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_voucher_charge" ("amount", "atRate", "chargeName", "createdAt", "id", "onValue", "plusMinus", "updatedAt", "voucherId") SELECT "amount", "atRate", "chargeName", "createdAt", "id", "onValue", "plusMinus", "updatedAt", "voucherId" FROM "voucher_charge";
DROP TABLE "voucher_charge";
ALTER TABLE "new_voucher_charge" RENAME TO "voucher_charge";
CREATE INDEX "voucher_charge_voucherId_idx" ON "voucher_charge"("voucherId");
CREATE INDEX "voucher_charge_otherChargesId_idx" ON "voucher_charge"("otherChargesId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
