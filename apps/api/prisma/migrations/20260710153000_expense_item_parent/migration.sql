-- AlterTable
ALTER TABLE "expense_items" ADD COLUMN "parent_id" TEXT;

-- CreateIndex
CREATE INDEX "expense_items_parent_id_idx" ON "expense_items"("parent_id");
