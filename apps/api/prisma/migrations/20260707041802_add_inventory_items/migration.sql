-- CreateEnum
CREATE TYPE "ItemNature" AS ENUM ('GOODS', 'FINISHED_GOOD', 'SERVICE', 'MATERIAL', 'TOOL');

-- CreateEnum
CREATE TYPE "ItemTaxReduction" AS ENUM ('UNDETERMINED', 'REDUCED', 'NOT_REDUCED');

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nature" "ItemNature" NOT NULL DEFAULT 'GOODS',
    "tax_reduction" "ItemTaxReduction" NOT NULL DEFAULT 'UNDETERMINED',
    "group_name" TEXT,
    "unit" TEXT,
    "stock_quantity" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "stock_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "min_stock" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "warranty_months" INTEGER,
    "origin" TEXT,
    "description" TEXT,
    "purchase_description" TEXT,
    "sales_description" TEXT,
    "default_warehouse" TEXT,
    "stock_account" TEXT,
    "revenue_account" TEXT,
    "expense_account" TEXT,
    "purchase_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sale_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "price_after_tax" BOOLEAN NOT NULL DEFAULT false,
    "branch_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_code_key" ON "inventory_items"("code");

-- CreateIndex
CREATE INDEX "inventory_items_name_idx" ON "inventory_items"("name");

-- CreateIndex
CREATE INDEX "inventory_items_nature_idx" ON "inventory_items"("nature");
