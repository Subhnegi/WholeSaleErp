/*
  Warnings:

  - You are about to drop the column `companyId` on the `financial_years` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `financial_years` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."financial_years" DROP CONSTRAINT "financial_years_companyId_fkey";

-- AlterTable
ALTER TABLE "financial_years" DROP COLUMN "companyId",
DROP COLUMN "isActive";

-- CreateTable
CREATE TABLE "company_financial_years" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "financialYearId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_financial_years_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_financial_years_companyId_financialYearId_key" ON "company_financial_years"("companyId", "financialYearId");

-- AddForeignKey
ALTER TABLE "company_financial_years" ADD CONSTRAINT "company_financial_years_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_financial_years" ADD CONSTRAINT "company_financial_years_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;
