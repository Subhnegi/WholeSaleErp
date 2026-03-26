/*
  Warnings:

  - You are about to drop the `company_financial_years` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `financial_years` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `fyEndDate` to the `companies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fyLabel` to the `companies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fyStartDate` to the `companies` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."company_financial_years" DROP CONSTRAINT "company_financial_years_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."company_financial_years" DROP CONSTRAINT "company_financial_years_financialYearId_fkey";

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "fyEndDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fyLabel" TEXT NOT NULL,
ADD COLUMN     "fyStartDate" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "public"."company_financial_years";

-- DropTable
DROP TABLE "public"."financial_years";
