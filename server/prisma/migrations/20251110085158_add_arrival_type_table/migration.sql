-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "code" TEXT,
    "printAs" TEXT,
    "printAsLang" TEXT,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionAsPer" TEXT,
    "marketFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rdf" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bardanaPerNug" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laga" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wtPerNug" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kaatPerNug" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maintainCratesInSalePurchase" BOOLEAN NOT NULL DEFAULT false,
    "disableWeight" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crate_marka" (
    "id" TEXT NOT NULL,
    "crateMarkaName" TEXT NOT NULL,
    "printAs" TEXT,
    "opQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crate_marka_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arrival_type" (
    "id" TEXT NOT NULL,
    "arrivalTypeName" TEXT NOT NULL,
    "partyStock" BOOLEAN NOT NULL DEFAULT false,
    "selfPurchase" BOOLEAN NOT NULL DEFAULT false,
    "vehicleNo" TEXT,
    "autoRoundoffAmount" BOOLEAN NOT NULL DEFAULT false,
    "askForAdditionalFields" BOOLEAN NOT NULL DEFAULT false,
    "requireForwardingAgent" BOOLEAN NOT NULL DEFAULT false,
    "requireBroker" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arrival_type_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "items_companyId_idx" ON "items"("companyId");

-- CreateIndex
CREATE INDEX "items_itemName_idx" ON "items"("itemName");

-- CreateIndex
CREATE INDEX "crate_marka_companyId_idx" ON "crate_marka"("companyId");

-- CreateIndex
CREATE INDEX "crate_marka_crateMarkaName_idx" ON "crate_marka"("crateMarkaName");

-- CreateIndex
CREATE INDEX "arrival_type_companyId_idx" ON "arrival_type"("companyId");

-- CreateIndex
CREATE INDEX "arrival_type_arrivalTypeName_idx" ON "arrival_type"("arrivalTypeName");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crate_marka" ADD CONSTRAINT "crate_marka_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrival_type" ADD CONSTRAINT "arrival_type_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
