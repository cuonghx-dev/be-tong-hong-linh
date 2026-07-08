-- CreateEnum
CREATE TYPE "InventoryReceiptType" AS ENUM ('PURCHASE', 'FINISHED_GOODS', 'SALES_RETURN', 'OTHER');

-- CreateTable
CREATE TABLE "inventory_receipts" (
    "id" TEXT NOT NULL,
    "receipt_type" "InventoryReceiptType" NOT NULL DEFAULT 'OTHER',
    "voucher_no" TEXT NOT NULL,
    "posting_date" DATE NOT NULL,
    "voucher_date" DATE NOT NULL,
    "partner_id" TEXT,
    "partner_name" TEXT,
    "address" TEXT,
    "deliverer" TEXT,
    "description" TEXT,
    "reference" TEXT,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "branch_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "inventory_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_receipt_lines" (
    "id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "item_id" TEXT,
    "item_name" TEXT,
    "warehouse_id" TEXT,
    "debit_account" TEXT,
    "credit_account" TEXT,
    "unit" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lot_no" TEXT,
    "expiry_date" DATE,

    CONSTRAINT "inventory_receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_receipts_voucher_no_key" ON "inventory_receipts"("voucher_no");

-- CreateIndex
CREATE INDEX "inventory_receipts_receipt_type_posting_date_idx" ON "inventory_receipts"("receipt_type", "posting_date");

-- CreateIndex
CREATE INDEX "inventory_receipt_lines_receipt_id_idx" ON "inventory_receipt_lines"("receipt_id");

-- AddForeignKey
ALTER TABLE "inventory_receipt_lines" ADD CONSTRAINT "inventory_receipt_lines_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "inventory_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
