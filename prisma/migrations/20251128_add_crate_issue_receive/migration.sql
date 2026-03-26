-- Migration: add crate_issue/crate_issue_item and crate_receive/crate_receive_item tables
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "crate_issue" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "companyId" TEXT NOT NULL,
  "issueDate" TEXT NOT NULL,
  "totalQty" REAL DEFAULT 0,
  "totalCrateAmount" REAL DEFAULT 0,
  "createdAt" DATETIME DEFAULT (datetime('now')),
  "updatedAt" DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "crate_issue_item" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "crateIssueId" TEXT NOT NULL,
  "slipNo" TEXT,
  "accountId" TEXT NOT NULL,
  "crateMarkaId" TEXT NOT NULL,
  "qty" REAL DEFAULT 0,
  "remarks" TEXT,
  "createdAt" DATETIME DEFAULT (datetime('now')),
  "updatedAt" DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY ("crateIssueId") REFERENCES "crate_issue" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("crateMarkaId") REFERENCES "crate_marka" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_crate_issue_companyId" ON "crate_issue" ("companyId");
CREATE INDEX IF NOT EXISTS "idx_crate_issue_item_crateIssueId" ON "crate_issue_item" ("crateIssueId");
CREATE INDEX IF NOT EXISTS "idx_crate_issue_item_accountId" ON "crate_issue_item" ("accountId");
CREATE INDEX IF NOT EXISTS "idx_crate_issue_item_crateMarkaId" ON "crate_issue_item" ("crateMarkaId");

-- Crate receive tables
CREATE TABLE IF NOT EXISTS "crate_receive" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "companyId" TEXT NOT NULL,
  "receiveDate" TEXT NOT NULL,
  "totalQty" REAL DEFAULT 0,
  "totalCrateAmount" REAL DEFAULT 0,
  "createdAt" DATETIME DEFAULT (datetime('now')),
  "updatedAt" DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "crate_receive_item" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "crateReceiveId" TEXT NOT NULL,
  "slipNo" TEXT,
  "accountId" TEXT NOT NULL,
  "crateMarkaId" TEXT NOT NULL,
  "qty" REAL DEFAULT 0,
  "remarks" TEXT,
  "createdAt" DATETIME DEFAULT (datetime('now')),
  "updatedAt" DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY ("crateReceiveId") REFERENCES "crate_receive" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("crateMarkaId") REFERENCES "crate_marka" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_crate_receive_companyId" ON "crate_receive" ("companyId");
CREATE INDEX IF NOT EXISTS "idx_crate_receive_item_crateReceiveId" ON "crate_receive_item" ("crateReceiveId");
CREATE INDEX IF NOT EXISTS "idx_crate_receive_item_accountId" ON "crate_receive_item" ("accountId");
CREATE INDEX IF NOT EXISTS "idx_crate_receive_item_crateMarkaId" ON "crate_receive_item" ("crateMarkaId");

COMMIT;
PRAGMA foreign_keys=ON;
