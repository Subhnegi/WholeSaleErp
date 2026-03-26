-- CreateTable
CREATE TABLE "AuthSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "licenseStartDate" TEXT NOT NULL,
    "licenseEndDate" TEXT NOT NULL,
    "licenseIsTrial" BOOLEAN NOT NULL DEFAULT false,
    "licenseStatus" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "printName" TEXT,
    "printNameLang" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "countryCode" TEXT,
    "mobile1" TEXT,
    "mobile2" TEXT,
    "email" TEXT,
    "website" TEXT,
    "contactPerson" TEXT,
    "billTitle" TEXT,
    "userId" TEXT NOT NULL,
    "companyPassword" TEXT,
    "fyStartDate" TEXT NOT NULL,
    "fyEndDate" TEXT NOT NULL,
    "fyLabel" TEXT NOT NULL,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UpdateInfo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lastCheckDate" DATETIME NOT NULL,
    "currentVersion" TEXT NOT NULL,
    "availableVersion" TEXT,
    "updateAvailable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "account_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "parentGroupId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" DATETIME,
    CONSTRAINT "account_groups_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "account_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountName" TEXT NOT NULL,
    "code" TEXT,
    "accountGroupId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "openingBalance" REAL NOT NULL DEFAULT 0,
    "drCr" TEXT NOT NULL DEFAULT 'Dr',
    "area" TEXT,
    "srNo" TEXT,
    "crLimit" REAL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" DATETIME,
    CONSTRAINT "accounts_accountGroupId_fkey" FOREIGN KEY ("accountGroupId") REFERENCES "account_groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
