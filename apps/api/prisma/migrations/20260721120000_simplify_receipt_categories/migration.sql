-- Đơn giản hóa lý do phiếu thu: chỉ còn RECEIPT (Thu khác) + SALES_CASH.
-- Xóa 4 giá trị enum: RECEIPT_BANK_WITHDRAW, RECEIPT_EMPLOYEE_ADVANCE,
-- RECEIPT_CUSTOMER, RECEIPT_LOAN_RECOVERY.

-- Quy dữ liệu cũ (nếu có) về RECEIPT trước khi thu hẹp enum.
UPDATE "cash_vouchers"
SET "category" = 'RECEIPT'
WHERE "category" IN (
  'RECEIPT_BANK_WITHDRAW',
  'RECEIPT_EMPLOYEE_ADVANCE',
  'RECEIPT_CUSTOMER',
  'RECEIPT_LOAN_RECOVERY'
);

-- Postgres không hỗ trợ DROP VALUE trên enum → tạo type mới rồi hoán đổi.
CREATE TYPE "CashVoucherCategory_new" AS ENUM (
  'SALES_CASH',
  'RECEIPT',
  'PAYMENT_EMPLOYEE_ADVANCE',
  'PAYMENT',
  'DEPOSIT_TO_BANK',
  'PAYMENT_SUPPLIER',
  'PAYMENT_PURCHASE_WITH_INVOICE',
  'PAYMENT_SALARY_ADVANCE',
  'PAYMENT_SALARY',
  'PAYMENT_TO_BRANCH',
  'PAYMENT_LOAN',
  'PAYMENT_CIT_TAX',
  'PURCHASE_SERVICE_CASH',
  'PURCHASE_GOODS_CASH'
);

ALTER TABLE "cash_vouchers"
  ALTER COLUMN "category" TYPE "CashVoucherCategory_new"
  USING ("category"::text::"CashVoucherCategory_new");

DROP TYPE "CashVoucherCategory";

ALTER TYPE "CashVoucherCategory_new" RENAME TO "CashVoucherCategory";
