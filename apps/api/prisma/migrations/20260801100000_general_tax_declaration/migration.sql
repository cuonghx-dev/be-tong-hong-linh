-- Kê khai hóa đơn NVK (tab "Kê khai hóa đơn và hạch toán thuế").

-- CreateEnum
CREATE TYPE "GeneralTaxType" AS ENUM ('INPUT_INCREASE', 'INPUT_DECREASE', 'OUTPUT_INCREASE', 'OUTPUT_DECREASE');

-- AlterTable
ALTER TABLE "general_vouchers" ADD COLUMN "exclude_from_vat_report" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "general_voucher_tax_lines" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "description" TEXT,
    "has_invoice" BOOLEAN NOT NULL DEFAULT true,
    "tax_type" "GeneralTaxType",
    "taxable_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_rate" DECIMAL(5,2),
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_account" TEXT,
    "invoice_no" TEXT,
    "invoice_date" DATE,
    "goods_service_group" TEXT,
    "partner_id" TEXT,
    "partner_name" TEXT,
    "supplier_tax_code" TEXT,

    CONSTRAINT "general_voucher_tax_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "general_voucher_tax_lines_voucher_id_line_no_key" ON "general_voucher_tax_lines"("voucher_id", "line_no");

-- AddForeignKey
ALTER TABLE "general_voucher_tax_lines" ADD CONSTRAINT "general_voucher_tax_lines_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "general_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
