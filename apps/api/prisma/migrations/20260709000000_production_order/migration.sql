-- CreateEnum
CREATE TYPE "ProductionOrderStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ProductionOrderLineType" AS ENUM ('PRODUCT', 'MATERIAL');

-- CreateTable
CREATE TABLE "production_orders" (
    "id" TEXT NOT NULL,
    "voucher_no" TEXT NOT NULL,
    "order_date" DATE NOT NULL,
    "description" TEXT,
    "receipt_complete" BOOLEAN NOT NULL DEFAULT false,
    "issue_complete" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProductionOrderStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "branch_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_order_lines" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "line_type" "ProductionOrderLineType" NOT NULL DEFAULT 'PRODUCT',
    "item_id" TEXT,
    "item_name" TEXT,
    "unit" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "production_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "production_orders_voucher_no_key" ON "production_orders"("voucher_no");

-- CreateIndex
CREATE INDEX "production_orders_status_order_date_idx" ON "production_orders"("status", "order_date");

-- CreateIndex
CREATE INDEX "production_order_lines_order_id_idx" ON "production_order_lines"("order_id");

-- AddForeignKey
ALTER TABLE "production_order_lines" ADD CONSTRAINT "production_order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
