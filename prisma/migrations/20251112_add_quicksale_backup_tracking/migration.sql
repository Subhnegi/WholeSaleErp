-- Add QuickSale tracking columns to backup_tracking table
-- Phase 10.4: Quick Sale Backup Management

-- Add quickSalesCount column
ALTER TABLE "backup_tracking" ADD COLUMN "quickSalesCount" INTEGER NOT NULL DEFAULT 0;

-- Add quickSaleItemsCount column
ALTER TABLE "backup_tracking" ADD COLUMN "quickSaleItemsCount" INTEGER NOT NULL DEFAULT 0;
