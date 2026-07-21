-- Đối trừ thu tiền khách hàng theo hóa đơn (MISA: Thu tiền khách hàng).
CREATE TABLE "payment_allocations" (
    "id" TEXT NOT NULL,
    "sales_voucher_id" TEXT NOT NULL,
    "cash_voucher_id" TEXT,
    "bank_voucher_id" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_allocations_sales_voucher_id_idx" ON "payment_allocations"("sales_voucher_id");
CREATE INDEX "payment_allocations_cash_voucher_id_idx" ON "payment_allocations"("cash_voucher_id");
CREATE INDEX "payment_allocations_bank_voucher_id_idx" ON "payment_allocations"("bank_voucher_id");

ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_sales_voucher_id_fkey" FOREIGN KEY ("sales_voucher_id") REFERENCES "sales_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_cash_voucher_id_fkey" FOREIGN KEY ("cash_voucher_id") REFERENCES "cash_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_bank_voucher_id_fkey" FOREIGN KEY ("bank_voucher_id") REFERENCES "bank_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
