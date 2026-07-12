-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('GOODS', 'SERVICE', 'FINISHED', 'MATERIAL', 'TOOL');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProductType" NOT NULL DEFAULT 'GOODS',
    "group_code" TEXT,
    "unit" TEXT,
    "description" TEXT,
    "purchase_description" TEXT,
    "sale_description" TEXT,
    "default_warehouse_code" TEXT,
    "default_warehouse_name" TEXT,
    "inventory_account" TEXT,
    "revenue_account" TEXT,
    "discount_account" TEXT,
    "sale_return_account" TEXT,
    "cost_account" TEXT,
    "purchase_price" DECIMAL(18,2),
    "sale_price" DECIMAL(18,2),
    "min_stock" DECIMAL(18,2),
    "vat_rate" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_type_idx" ON "products"("type");
