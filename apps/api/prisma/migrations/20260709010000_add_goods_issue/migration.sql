-- CreateEnum
CREATE TYPE "GoodsIssueCategory" AS ENUM ('SALES', 'PRODUCTION', 'OTHER');

-- CreateTable
CREATE TABLE "goods_issue_vouchers" (
    "id" TEXT NOT NULL,
    "category" "GoodsIssueCategory" NOT NULL DEFAULT 'SALES',
    "voucher_no" TEXT NOT NULL,
    "posting_date" DATE NOT NULL,
    "voucher_date" DATE NOT NULL,
    "customer_id" TEXT,
    "customer_name" TEXT,
    "receiver" TEXT,
    "address" TEXT,
    "sales_employee_id" TEXT,
    "description" TEXT,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "delivery_location" TEXT,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sales_doc_status" TEXT,
    "invoice_issue_status" TEXT,
    "tax_authority_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "goods_issue_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_issue_lines" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "item_id" TEXT,
    "item_name" TEXT,
    "warehouse_id" TEXT,
    "debit_account" TEXT NOT NULL,
    "credit_account" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lot_no" TEXT,
    "expiry_date" DATE,

    CONSTRAINT "goods_issue_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "goods_issue_vouchers_voucher_no_key" ON "goods_issue_vouchers"("voucher_no");

-- CreateIndex
CREATE INDEX "goods_issue_vouchers_category_posting_date_idx" ON "goods_issue_vouchers"("category", "posting_date");

-- CreateIndex
CREATE INDEX "goods_issue_vouchers_customer_id_idx" ON "goods_issue_vouchers"("customer_id");

-- CreateIndex
CREATE INDEX "goods_issue_lines_voucher_id_idx" ON "goods_issue_lines"("voucher_id");

-- AddForeignKey
ALTER TABLE "goods_issue_lines" ADD CONSTRAINT "goods_issue_lines_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "goods_issue_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
