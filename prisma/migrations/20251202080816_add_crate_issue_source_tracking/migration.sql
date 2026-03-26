-- AlterTable
ALTER TABLE "crate_issue_item" ADD COLUMN "sourceId" TEXT;
ALTER TABLE "crate_issue_item" ADD COLUMN "sourceType" TEXT;
ALTER TABLE "crate_issue_item" ADD COLUMN "vchNo" TEXT;

-- CreateIndex
CREATE INDEX "crate_issue_item_sourceType_sourceId_idx" ON "crate_issue_item"("sourceType", "sourceId");
