-- CreateEnum
CREATE TYPE "PurchaseVoucherType" AS ENUM ('STOCK', 'NON_STOCK', 'SERVICE');

-- CreateEnum
CREATE TYPE "PurchasePaymentMode" AS ENUM ('UNPAID', 'IMMEDIATE');

-- CreateEnum
CREATE TYPE "PurchaseReceiveStatus" AS ENUM ('NOT_RECEIVED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "PurchasePaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('ORG', 'INDIVIDUAL');

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SupplierType" NOT NULL DEFAULT 'ORG',
    "is_customer" BOOLEAN NOT NULL DEFAULT false,
    "tax_code" TEXT,
    "budget_relation_code" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "group_id" TEXT,
    "employee_id" TEXT,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "debt_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "invoice_risk" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_vouchers" (
    "id" TEXT NOT NULL,
    "type" "PurchaseVoucherType" NOT NULL,
    "payment_mode" "PurchasePaymentMode" NOT NULL DEFAULT 'UNPAID',
    "payment_method" "PaymentMethod",
    "receive_with_invoice" BOOLEAN NOT NULL DEFAULT false,
    "voucher_no" TEXT NOT NULL,
    "invoice_no" TEXT,
    "posting_date" DATE NOT NULL,
    "voucher_date" DATE NOT NULL,
    "supplier_id" TEXT,
    "supplier_name" TEXT,
    "deliverer" TEXT,
    "address" TEXT,
    "employee_id" TEXT,
    "description" TEXT,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "contract_no" TEXT,
    "payment_term_id" TEXT,
    "credit_days" INTEGER,
    "due_date" DATE,
    "total_goods" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_vat" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_payment" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "purchase_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "stock_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "einvoice_lookup_code" TEXT,
    "einvoice_lookup_url" TEXT,
    "receive_status" "PurchaseReceiveStatus" NOT NULL DEFAULT 'NOT_RECEIVED',
    "payment_status" "PurchasePaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "branch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "purchase_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_voucher_lines" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "item_id" TEXT,
    "item_name" TEXT,
    "warehouse_id" TEXT,
    "stock_account" TEXT,
    "payable_account" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_account" TEXT NOT NULL,

    CONSTRAINT "purchase_voucher_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");

-- CreateIndex
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_vouchers_voucher_no_key" ON "purchase_vouchers"("voucher_no");

-- CreateIndex
CREATE INDEX "purchase_vouchers_type_posting_date_idx" ON "purchase_vouchers"("type", "posting_date");

-- CreateIndex
CREATE INDEX "purchase_vouchers_supplier_id_idx" ON "purchase_vouchers"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_voucher_lines_voucher_id_idx" ON "purchase_voucher_lines"("voucher_id");

-- AddForeignKey
ALTER TABLE "purchase_voucher_lines" ADD CONSTRAINT "purchase_voucher_lines_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "purchase_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
