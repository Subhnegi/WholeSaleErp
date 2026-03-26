/*
  Warnings:

  - Made the column `updatedAt` on table `crate_issue` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `crate_issue_item` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `crate_receive` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `crate_receive_item` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_crate_issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "issueDate" TEXT NOT NULL,
    "totalQty" REAL NOT NULL DEFAULT 0,
    "totalCrateAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_crate_issue" ("companyId", "createdAt", "id", "issueDate", "totalCrateAmount", "totalQty", "updatedAt") SELECT "companyId", coalesce("createdAt", CURRENT_TIMESTAMP) AS "createdAt", "id", "issueDate", coalesce("totalCrateAmount", 0) AS "totalCrateAmount", coalesce("totalQty", 0) AS "totalQty", "updatedAt" FROM "crate_issue";
DROP TABLE "crate_issue";
ALTER TABLE "new_crate_issue" RENAME TO "crate_issue";
CREATE INDEX "crate_issue_companyId_idx" ON "crate_issue"("companyId");
CREATE TABLE "new_crate_issue_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "crateIssueId" TEXT NOT NULL,
    "slipNo" TEXT,
    "accountId" TEXT NOT NULL,
    "crateMarkaId" TEXT NOT NULL,
    "qty" REAL NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "crate_issue_item_crateIssueId_fkey" FOREIGN KEY ("crateIssueId") REFERENCES "crate_issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "crate_issue_item_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "crate_issue_item_crateMarkaId_fkey" FOREIGN KEY ("crateMarkaId") REFERENCES "crate_marka" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_crate_issue_item" ("accountId", "crateIssueId", "crateMarkaId", "createdAt", "id", "qty", "remarks", "slipNo", "updatedAt") SELECT "accountId", "crateIssueId", "crateMarkaId", coalesce("createdAt", CURRENT_TIMESTAMP) AS "createdAt", "id", coalesce("qty", 0) AS "qty", "remarks", "slipNo", "updatedAt" FROM "crate_issue_item";
DROP TABLE "crate_issue_item";
ALTER TABLE "new_crate_issue_item" RENAME TO "crate_issue_item";
CREATE INDEX "crate_issue_item_crateIssueId_idx" ON "crate_issue_item"("crateIssueId");
CREATE INDEX "crate_issue_item_accountId_idx" ON "crate_issue_item"("accountId");
CREATE INDEX "crate_issue_item_crateMarkaId_idx" ON "crate_issue_item"("crateMarkaId");
CREATE TABLE "new_crate_receive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "receiveDate" TEXT NOT NULL,
    "totalQty" REAL NOT NULL DEFAULT 0,
    "totalCrateAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_crate_receive" ("companyId", "createdAt", "id", "receiveDate", "totalCrateAmount", "totalQty", "updatedAt") SELECT "companyId", coalesce("createdAt", CURRENT_TIMESTAMP) AS "createdAt", "id", "receiveDate", coalesce("totalCrateAmount", 0) AS "totalCrateAmount", coalesce("totalQty", 0) AS "totalQty", "updatedAt" FROM "crate_receive";
DROP TABLE "crate_receive";
ALTER TABLE "new_crate_receive" RENAME TO "crate_receive";
CREATE INDEX "crate_receive_companyId_idx" ON "crate_receive"("companyId");
CREATE TABLE "new_crate_receive_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "crateReceiveId" TEXT NOT NULL,
    "slipNo" TEXT,
    "accountId" TEXT NOT NULL,
    "crateMarkaId" TEXT NOT NULL,
    "qty" REAL NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "crate_receive_item_crateReceiveId_fkey" FOREIGN KEY ("crateReceiveId") REFERENCES "crate_receive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "crate_receive_item_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "crate_receive_item_crateMarkaId_fkey" FOREIGN KEY ("crateMarkaId") REFERENCES "crate_marka" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_crate_receive_item" ("accountId", "crateMarkaId", "crateReceiveId", "createdAt", "id", "qty", "remarks", "slipNo", "updatedAt") SELECT "accountId", "crateMarkaId", "crateReceiveId", coalesce("createdAt", CURRENT_TIMESTAMP) AS "createdAt", "id", coalesce("qty", 0) AS "qty", "remarks", "slipNo", "updatedAt" FROM "crate_receive_item";
DROP TABLE "crate_receive_item";
ALTER TABLE "new_crate_receive_item" RENAME TO "crate_receive_item";
CREATE INDEX "crate_receive_item_crateReceiveId_idx" ON "crate_receive_item"("crateReceiveId");
CREATE INDEX "crate_receive_item_accountId_idx" ON "crate_receive_item"("accountId");
CREATE INDEX "crate_receive_item_crateMarkaId_idx" ON "crate_receive_item"("crateMarkaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
