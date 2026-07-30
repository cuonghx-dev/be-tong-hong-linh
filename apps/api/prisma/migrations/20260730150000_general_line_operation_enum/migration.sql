-- Cột "Nghiệp vụ" NVK là dropdown danh sách cố định (form MISA) → chuyển TEXT sang enum.
-- Cột vừa thêm ở migration trước, chưa có dữ liệu → drop + add lại, không cần cast.
CREATE TYPE "GeneralLineOperation" AS ENUM (
  'SALES_TRADE_DISCOUNT',
  'SALES_REBATE',
  'SALES_RETURN',
  'TAX_DEDUCT_BUSINESS',
  'TAX_DEDUCT_INVESTMENT'
);

ALTER TABLE "general_voucher_lines" DROP COLUMN "operation";
ALTER TABLE "general_voucher_lines" ADD COLUMN "operation" "GeneralLineOperation";
