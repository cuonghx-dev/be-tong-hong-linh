-- Tab Hóa đơn chứng từ bán hàng (MISA): thông tin hóa đơn lập kèm.
CREATE TYPE "InvoicePaymentForm" AS ENUM ('CASH', 'TRANSFER', 'CASH_OR_TRANSFER');

ALTER TABLE "sales_vouchers"
  ADD COLUMN "invoice_form" TEXT,
  ADD COLUMN "invoice_serial" TEXT,
  ADD COLUMN "invoice_date" DATE,
  ADD COLUMN "buyer_name" TEXT,
  ADD COLUMN "invoice_payment_form" "InvoicePaymentForm",
  ADD COLUMN "bank_account_no" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "budget_relation_code" TEXT,
  ADD COLUMN "id_card_no" TEXT,
  ADD COLUMN "passport_no" TEXT;
