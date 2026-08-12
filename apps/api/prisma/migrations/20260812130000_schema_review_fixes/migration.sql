-- Sửa theo review schema 2026-08-12:
-- 1. inventory_receipts: đổi branch_name → branch_id cho đồng bộ mọi bảng chứng từ.
-- 2. inventory_receipts: thêm partner_type phân định loại đối tượng (như cash/bank);
--    backfill phiếu nhập mua hàng đã có đối tượng → SUPPLIER.
-- 3. book_locks: ép singleton ở DB (id luôn = 1).
-- 4. Đối trừ (payment_allocations, purchase_cost_allocations): amount phải > 0 —
--    dòng 0 đồng là rác không mang nghĩa, xóa trước khi thêm CHECK.
-- 5. Số dư đầu kỳ: debit/credit/quantity/amount không âm — số âm phải chuẩn hóa
--    sang vế đối diện trước khi ghi.

-- 1. branch_name → branch_id
ALTER TABLE "inventory_receipts" RENAME COLUMN "branch_name" TO "branch_id";

-- 2. partner_type + backfill
ALTER TABLE "inventory_receipts" ADD COLUMN "partner_type" "PartnerType";
UPDATE "inventory_receipts"
SET "partner_type" = 'SUPPLIER'
WHERE "receipt_type" = 'PURCHASE'
  AND ("partner_id" IS NOT NULL OR "partner_name" IS NOT NULL);

-- 3. book_locks singleton
ALTER TABLE "book_locks" ADD CONSTRAINT "book_locks_singleton" CHECK ("id" = 1);

-- 4. Đối trừ amount > 0 (dọn dòng 0 đồng trước — không ảnh hưởng số liệu)
DELETE FROM "payment_allocations" WHERE "amount" <= 0;
ALTER TABLE "payment_allocations"
  ADD CONSTRAINT "payment_allocations_amount_positive" CHECK ("amount" > 0);

DELETE FROM "purchase_cost_allocations" WHERE "amount" <= 0;
ALTER TABLE "purchase_cost_allocations"
  ADD CONSTRAINT "purchase_cost_allocations_amount_positive" CHECK ("amount" > 0);

-- 5. Số dư đầu kỳ không âm
ALTER TABLE "account_opening_balances"
  ADD CONSTRAINT "account_opening_balances_amounts_nonneg"
  CHECK ("debit_amount" >= 0 AND "credit_amount" >= 0);

ALTER TABLE "partner_opening_balances"
  ADD CONSTRAINT "partner_opening_balances_amounts_nonneg"
  CHECK ("debit_amount" >= 0 AND "credit_amount" >= 0);

ALTER TABLE "bank_account_opening_balances"
  ADD CONSTRAINT "bank_account_opening_balances_amounts_nonneg"
  CHECK ("debit_amount" >= 0 AND "credit_amount" >= 0);

ALTER TABLE "inventory_opening_balances"
  ADD CONSTRAINT "inventory_opening_balances_amounts_nonneg"
  CHECK ("quantity" >= 0 AND "amount" >= 0);
