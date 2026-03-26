-- CreateTable: stock_ledger
-- This table maintains running stock balance for lot-wise inventory tracking

CREATE TABLE IF NOT EXISTS stock_ledger (
  id            TEXT PRIMARY KEY,
  companyId     TEXT NOT NULL,
  itemId        TEXT NOT NULL,
  lotNoVariety  TEXT NOT NULL,
  supplierId    TEXT NOT NULL,
  storeId       TEXT,
  
  -- Running balance
  totalNug      REAL NOT NULL DEFAULT 0,
  totalKg       REAL NOT NULL DEFAULT 0,
  soldNug       REAL NOT NULL DEFAULT 0,
  soldKg        REAL NOT NULL DEFAULT 0,
  availableNug  REAL NOT NULL DEFAULT 0,
  availableKg   REAL NOT NULL DEFAULT 0,
  
  createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS stock_ledger_companyId_itemId_lotNoVariety_supplierId_storeId_key 
  ON stock_ledger(companyId, itemId, lotNoVariety, supplierId, storeId);

-- Create indexes
CREATE INDEX IF NOT EXISTS stock_ledger_companyId_idx ON stock_ledger(companyId);
CREATE INDEX IF NOT EXISTS stock_ledger_supplierId_idx ON stock_ledger(supplierId);
CREATE INDEX IF NOT EXISTS stock_ledger_itemId_idx ON stock_ledger(itemId);
CREATE INDEX IF NOT EXISTS stock_ledger_storeId_idx ON stock_ledger(storeId);
CREATE INDEX IF NOT EXISTS stock_ledger_availableNug_idx ON stock_ledger(availableNug);

-- Drop the old view if it exists
DROP VIEW IF EXISTS lot_stock_view;
