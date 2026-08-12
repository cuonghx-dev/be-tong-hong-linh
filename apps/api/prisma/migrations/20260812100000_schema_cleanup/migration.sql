-- Chuẩn hóa schema (review 2026-08-12):
--  1. Bỏ enum "PaymentMethod" — không có cột nào dùng (code dùng enum cùng tên
--     từ @app/shared cho DTO thu tiền khách hàng, không phải kiểu DB).
--  2. bank_account_opening_balances: bỏ index account_code trùng (đã là leading
--     column của unique), thêm index FK bank_account_id phục vụ Cascade.
--  3. partner_opening_balances: bỏ index account_code trùng (như trên).
--  4. voucher_types: bỏ index code trùng (code đã unique).
--  5. inventory_opening_balances.quantity: NUMERIC(18,2) → (18,4) đồng bộ
--     precision số lượng với các bảng *_lines.

-- 1. DropEnum
DROP TYPE "PaymentMethod";

-- 2. bank_account_opening_balances
DROP INDEX "bank_account_opening_balances_account_code_idx";
CREATE INDEX "bank_account_opening_balances_bank_account_id_idx" ON "bank_account_opening_balances"("bank_account_id");

-- 3. partner_opening_balances
DROP INDEX "partner_opening_balances_account_code_idx";

-- 4. voucher_types
DROP INDEX "voucher_types_code_idx";

-- 5. AlterTable
ALTER TABLE "inventory_opening_balances" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(18,4);
