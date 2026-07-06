-- CreateEnum
CREATE TYPE "BankVoucherType" AS ENUM ('RECEIPT', 'PAYMENT');

-- CreateEnum
CREATE TYPE "BankVoucherCategory" AS ENUM ('RECEIPT', 'PAYMENT', 'SALES_BANK', 'PURCHASE_SERVICE_BANK', 'PURCHASE_GOODS_BANK');

-- CreateEnum
CREATE TYPE "BankPaymentMethod" AS ENUM ('UNC', 'TRANSFER', 'CHECK');

-- CreateTable
CREATE TABLE "bank_vouchers" (
    "id" TEXT NOT NULL,
    "type" "BankVoucherType" NOT NULL,
    "category" "BankVoucherCategory" NOT NULL,
    "voucher_no" TEXT NOT NULL,
    "payment_method" "BankPaymentMethod",
    "is_batch_transfer" BOOLEAN NOT NULL DEFAULT false,
    "internal_ref" TEXT,
    "posting_date" DATE NOT NULL,
    "voucher_date" DATE NOT NULL,
    "bank_account_no" TEXT,
    "bank_name" TEXT,
    "receiver_account_no" TEXT,
    "partner_type" "PartnerType",
    "partner_id" TEXT,
    "partner_name" TEXT,
    "address" TEXT,
    "employee_id" TEXT,
    "reason" TEXT,
    "reference" TEXT,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "branch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "bank_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_voucher_lines" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "description" TEXT,
    "debit_account" TEXT NOT NULL,
    "credit_account" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "partner_id" TEXT,
    "partner_name" TEXT,

    CONSTRAINT "bank_voucher_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_vouchers_voucher_no_key" ON "bank_vouchers"("voucher_no");

-- CreateIndex
CREATE INDEX "bank_vouchers_type_posting_date_idx" ON "bank_vouchers"("type", "posting_date");

-- CreateIndex
CREATE INDEX "bank_vouchers_partner_id_idx" ON "bank_vouchers"("partner_id");

-- CreateIndex
CREATE INDEX "bank_voucher_lines_voucher_id_idx" ON "bank_voucher_lines"("voucher_id");

-- AddForeignKey
ALTER TABLE "bank_voucher_lines" ADD CONSTRAINT "bank_voucher_lines_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "bank_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
