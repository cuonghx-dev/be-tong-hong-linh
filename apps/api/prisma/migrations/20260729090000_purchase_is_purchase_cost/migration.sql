-- Cờ "Là chi phí mua hàng" (MISA, chứng từ mua dịch vụ §10.4): chỉ chứng từ
-- được đánh dấu mới được chọn trong dialog phân bổ chi phí.
ALTER TABLE "purchase_vouchers" ADD COLUMN "is_purchase_cost" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: chứng từ dịch vụ đã từng được đem phân bổ giữ nguyên hiệu lực
-- (không thì sửa phiếu nhận sẽ bị chặn vì chứng từ CP "chưa đánh dấu").
UPDATE "purchase_vouchers"
SET "is_purchase_cost" = true
WHERE "id" IN (SELECT DISTINCT "cost_voucher_id" FROM "purchase_cost_allocations");
