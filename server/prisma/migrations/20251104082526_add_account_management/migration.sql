-- CreateTable
CREATE TABLE "account_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentGroupId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "code" TEXT,
    "accountGroupId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "drCr" TEXT NOT NULL DEFAULT 'Dr',
    "area" TEXT,
    "srNo" TEXT,
    "crLimit" DOUBLE PRECISION,
    "nameLang" TEXT,
    "address" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "panNo" TEXT,
    "mobile1" TEXT,
    "mobile2" TEXT,
    "bankName1" TEXT,
    "accountNo1" TEXT,
    "bankName2" TEXT,
    "accountNo2" TEXT,
    "contactPerson" TEXT,
    "ledgerFolioNo" TEXT,
    "auditUpto" TEXT,
    "maintainBillByBillBalance" BOOLEAN NOT NULL DEFAULT false,
    "photo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_groups_companyId_idx" ON "account_groups"("companyId");

-- CreateIndex
CREATE INDEX "account_groups_parentGroupId_idx" ON "account_groups"("parentGroupId");

-- CreateIndex
CREATE INDEX "accounts_companyId_idx" ON "accounts"("companyId");

-- CreateIndex
CREATE INDEX "accounts_accountGroupId_idx" ON "accounts"("accountGroupId");

-- CreateIndex
CREATE INDEX "accounts_accountName_idx" ON "accounts"("accountName");

-- AddForeignKey
ALTER TABLE "account_groups" ADD CONSTRAINT "account_groups_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_groups" ADD CONSTRAINT "account_groups_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "account_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_accountGroupId_fkey" FOREIGN KEY ("accountGroupId") REFERENCES "account_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
