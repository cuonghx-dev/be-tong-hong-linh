-- CreateEnum
CREATE TYPE "SalesVoucherType" AS ENUM ('DOMESTIC_GOODS', 'DOMESTIC_SERVICE');

-- CreateEnum
CREATE TYPE "SalesPaymentMode" AS ENUM ('UNPAID', 'PAID_NOW');

-- CreateEnum
CREATE TYPE "InvoiceIssueStatus" AS ENUM ('UNISSUED', 'CODE_ISSUED');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('ORG', 'INDIVIDUAL');

-- CreateEnum (dùng chung với các phân hệ khác — tạo nếu chưa có)
DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL DEFAULT 'ORG',
    "is_supplier" BOOLEAN NOT NULL DEFAULT false,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "tax_code" TEXT,
    "budget_relation_code" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "group_id" TEXT,
    "sales_employee_id" TEXT,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_vouchers" (
    "id" TEXT NOT NULL,
    "voucher_no" TEXT NOT NULL,
    "voucher_type" "SalesVoucherType" NOT NULL,
    "payment_mode" "SalesPaymentMode" NOT NULL DEFAULT 'UNPAID',
    "payment_method" "PaymentMethod",
    "is_inventory_issue" BOOLEAN NOT NULL DEFAULT false,
    "with_invoice" BOOLEAN NOT NULL DEFAULT false,
    "is_pos_invoice" BOOLEAN NOT NULL DEFAULT false,
    "posting_date" DATE NOT NULL,
    "voucher_date" DATE NOT NULL,
    "customer_id" TEXT,
    "customer_name" TEXT,
    "tax_code" TEXT,
    "contact_person" TEXT,
    "address" TEXT,
    "sales_employee_id" TEXT,
    "description" TEXT,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "payment_term_id" TEXT,
    "credit_days" INTEGER,
    "due_date" DATE,
    "total_goods" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_vat" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "einvoice_lookup_code" TEXT,
    "einvoice_lookup_url" TEXT,
    "receipt_id" TEXT,
    "branch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "sales_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_voucher_lines" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "item_id" TEXT,
    "item_name" TEXT,
    "trade_discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "debt_account" TEXT NOT NULL,
    "revenue_account" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_account" TEXT NOT NULL,
    "lot_no" TEXT,

    CONSTRAINT "sales_voucher_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoice_no" TEXT,
    "invoice_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Hóa đơn mới',
    "issue_status" "InvoiceIssueStatus" NOT NULL DEFAULT 'UNISSUED',
    "template_no" TEXT,
    "symbol" TEXT,
    "tax_authority_code" TEXT,
    "tax_submit_status" TEXT,
    "send_status" TEXT,
    "customer_received" BOOLEAN NOT NULL DEFAULT false,
    "lookup_code" TEXT,
    "lookup_url" TEXT,
    "payment_form" TEXT,
    "bank_account" TEXT,
    "invoice_date" DATE NOT NULL,
    "posted" BOOLEAN NOT NULL DEFAULT false,
    "sales_voucher_id" TEXT,
    "customer_id" TEXT,
    "customer_name" TEXT,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "branch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sales_vouchers_voucher_no_key" ON "sales_vouchers"("voucher_no");

-- CreateIndex
CREATE INDEX "sales_vouchers_voucher_type_posting_date_idx" ON "sales_vouchers"("voucher_type", "posting_date");

-- CreateIndex
CREATE INDEX "sales_vouchers_customer_id_idx" ON "sales_vouchers"("customer_id");

-- CreateIndex
CREATE INDEX "sales_vouchers_payment_mode_idx" ON "sales_vouchers"("payment_mode");

-- CreateIndex
CREATE INDEX "sales_voucher_lines_voucher_id_idx" ON "sales_voucher_lines"("voucher_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_sales_voucher_id_key" ON "invoices"("sales_voucher_id");

-- CreateIndex
CREATE INDEX "invoices_issue_status_invoice_date_idx" ON "invoices"("issue_status", "invoice_date");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

-- AddForeignKey
ALTER TABLE "sales_vouchers" ADD CONSTRAINT "sales_vouchers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_voucher_lines" ADD CONSTRAINT "sales_voucher_lines_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "sales_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sales_voucher_id_fkey" FOREIGN KEY ("sales_voucher_id") REFERENCES "sales_vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
