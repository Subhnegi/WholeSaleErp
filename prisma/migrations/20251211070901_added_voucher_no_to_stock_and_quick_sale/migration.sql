/*
  Warnings:

  - A unique constraint covering the columns `[companyId,voucherNo]` on the table `quick_sale` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,voucherNo]` on the table `stock_sale` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "quick_sale" ADD COLUMN "voucherNo" TEXT;

-- AlterTable
ALTER TABLE "stock_sale" ADD COLUMN "voucherNo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "quick_sale_companyId_voucherNo_key" ON "quick_sale"("companyId", "voucherNo");

-- CreateIndex
CREATE UNIQUE INDEX "stock_sale_companyId_voucherNo_key" ON "stock_sale"("companyId", "voucherNo");
