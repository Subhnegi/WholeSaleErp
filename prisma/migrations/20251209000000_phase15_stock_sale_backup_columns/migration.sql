-- Phase 15: ensure backup tracking stores counts for stock sale tables
ALTER TABLE "backup_tracking" ADD COLUMN "stockSalesCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "backup_tracking" ADD COLUMN "stockSaleItemsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "backup_tracking" ADD COLUMN "stockLedgersCount" INTEGER NOT NULL DEFAULT 0;
