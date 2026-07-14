-- AlterTable
ALTER TABLE "organization_units" ADD COLUMN "parent_id" TEXT;

-- CreateIndex
CREATE INDEX "organization_units_parent_id_idx" ON "organization_units"("parent_id");
