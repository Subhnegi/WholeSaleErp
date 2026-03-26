-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_arrival_type" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purchaseType" TEXT NOT NULL DEFAULT 'partyStock',
    "vehicleNoByDefault" TEXT,
    "autoRoundOffAmount" BOOLEAN NOT NULL DEFAULT false,
    "askForAdditionalFields" BOOLEAN NOT NULL DEFAULT false,
    "requireForwardingAgent" BOOLEAN NOT NULL DEFAULT false,
    "requireBroker" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_arrival_type" ("askForAdditionalFields", "autoRoundOffAmount", "companyId", "createdAt", "id", "name", "purchaseType", "requireBroker", "requireForwardingAgent", "updatedAt", "vehicleNoByDefault") SELECT "askForAdditionalFields", "autoRoundOffAmount", "companyId", "createdAt", "id", "name", "purchaseType", "requireBroker", "requireForwardingAgent", "updatedAt", "vehicleNoByDefault" FROM "arrival_type";
DROP TABLE "arrival_type";
ALTER TABLE "new_arrival_type" RENAME TO "arrival_type";
CREATE INDEX "arrival_type_companyId_idx" ON "arrival_type"("companyId");
CREATE INDEX "arrival_type_name_idx" ON "arrival_type"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
