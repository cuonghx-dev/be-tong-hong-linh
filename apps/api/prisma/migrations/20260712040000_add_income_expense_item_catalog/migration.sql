-- CreateEnum
CREATE TYPE "IncomeExpenseType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "income_expense_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "IncomeExpenseType" NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "income_expense_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "income_expense_items_code_key" ON "income_expense_items"("code");

-- CreateIndex
CREATE INDEX "income_expense_items_name_idx" ON "income_expense_items"("name");
