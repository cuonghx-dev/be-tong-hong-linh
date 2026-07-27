-- Tab Chi phí chứng từ mua hàng (§10.4): phân bổ chi phí từ chứng từ mua dịch vụ
-- vào chứng từ mua hàng nhập kho.
CREATE TABLE "purchase_cost_allocations" (
  "id" TEXT NOT NULL,
  "voucher_id" TEXT NOT NULL,
  "cost_voucher_id" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "purchase_cost_allocations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_cost_allocations_voucher_id_cost_voucher_id_key"
  ON "purchase_cost_allocations"("voucher_id", "cost_voucher_id");

CREATE INDEX "purchase_cost_allocations_cost_voucher_id_idx"
  ON "purchase_cost_allocations"("cost_voucher_id");

ALTER TABLE "purchase_cost_allocations"
  ADD CONSTRAINT "purchase_cost_allocations_voucher_id_fkey"
  FOREIGN KEY ("voucher_id") REFERENCES "purchase_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_cost_allocations"
  ADD CONSTRAINT "purchase_cost_allocations_cost_voucher_id_fkey"
  FOREIGN KEY ("cost_voucher_id") REFERENCES "purchase_vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
