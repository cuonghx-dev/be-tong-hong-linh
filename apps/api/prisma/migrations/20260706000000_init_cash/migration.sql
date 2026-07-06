-- CreateEnum
CREATE TYPE "CashVoucherType" AS ENUM ('RECEIPT', 'PAYMENT');

-- CreateEnum
CREATE TYPE "CashVoucherCategory" AS ENUM ('SALES_CASH', 'RECEIPT', 'PAYMENT', 'PURCHASE_SERVICE_CASH', 'PURCHASE_GOODS_CASH', 'DEPOSIT_TO_BANK');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'EMPLOYEE');

-- CreateTable
CREATE TABLE "cash_vouchers" (
    "id" TEXT NOT NULL,
    "type" "CashVoucherType" NOT NULL,
    "category" "CashVoucherCategory" NOT NULL,
    "voucher_no" TEXT NOT NULL,
    "posting_date" DATE NOT NULL,
    "voucher_date" DATE NOT NULL,
    "partner_type" "PartnerType",
    "partner_id" TEXT,
    "partner_name" TEXT,
    "payer_receiver" TEXT,
    "address" TEXT,
    "employee_id" TEXT,
    "reason" TEXT,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "branch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "cash_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_voucher_lines" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "description" TEXT,
    "debit_account" TEXT NOT NULL,
    "credit_account" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "operation" TEXT,
    "partner_id" TEXT,
    "partner_name" TEXT,
    "cost_item_id" TEXT,
    "bank_account_no" TEXT,
    "bank_name" TEXT,

    CONSTRAINT "cash_voucher_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_vouchers_voucher_no_key" ON "cash_vouchers"("voucher_no");

-- CreateIndex
CREATE INDEX "cash_vouchers_type_posting_date_idx" ON "cash_vouchers"("type", "posting_date");

-- CreateIndex
CREATE INDEX "cash_vouchers_partner_id_idx" ON "cash_vouchers"("partner_id");

-- CreateIndex
CREATE INDEX "cash_voucher_lines_voucher_id_idx" ON "cash_voucher_lines"("voucher_id");

-- AddForeignKey
ALTER TABLE "cash_voucher_lines" ADD CONSTRAINT "cash_voucher_lines_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "cash_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

