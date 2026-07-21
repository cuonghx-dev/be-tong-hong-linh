-- Đơn giản hóa lý do phiếu chi: chỉ còn PAYMENT_EMPLOYEE_ADVANCE (Tạm ứng cho
-- nhân viên), PAYMENT_PURCHASE_WITH_INVOICE (Chi mua ngoài có hóa đơn),
-- DEPOSIT_TO_BANK (Gửi tiền vào ngân hàng), PAYMENT (Chi khác) + 2 loại
-- PC tự sinh PURCHASE_SERVICE_CASH / PURCHASE_GOODS_CASH.
-- Xóa 6 giá trị enum: PAYMENT_SALARY_ADVANCE, PAYMENT_SUPPLIER,
-- PAYMENT_SALARY, PAYMENT_TO_BRANCH, PAYMENT_LOAN, PAYMENT_CIT_TAX.

-- Quy dữ liệu cũ (nếu có) về PAYMENT (Chi khác) trước khi thu hẹp enum.
-- So sánh qua ::text để chạy được cả khi enum hiện tại không còn giá trị cũ.
UPDATE "cash_vouchers"
SET "category" = 'PAYMENT'
WHERE "category"::text IN (
  'PAYMENT_SALARY_ADVANCE',
  'PAYMENT_SUPPLIER',
  'PAYMENT_SALARY',
  'PAYMENT_TO_BRANCH',
  'PAYMENT_LOAN',
  'PAYMENT_CIT_TAX'
);

-- Postgres không hỗ trợ DROP VALUE trên enum → tạo type mới rồi hoán đổi.
CREATE TYPE "CashVoucherCategory_new" AS ENUM (
  'SALES_CASH',
  'RECEIPT',
  'PAYMENT_EMPLOYEE_ADVANCE',
  'PAYMENT_PURCHASE_WITH_INVOICE',
  'DEPOSIT_TO_BANK',
  'PAYMENT',
  'PURCHASE_SERVICE_CASH',
  'PURCHASE_GOODS_CASH'
);

ALTER TABLE "cash_vouchers"
  ALTER COLUMN "category" TYPE "CashVoucherCategory_new"
  USING ("category"::text::"CashVoucherCategory_new");

DROP TYPE "CashVoucherCategory";

ALTER TYPE "CashVoucherCategory_new" RENAME TO "CashVoucherCategory";
