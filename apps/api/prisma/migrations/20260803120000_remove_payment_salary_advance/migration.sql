-- Bỏ loại nghiệp vụ "Trả lương tạm ứng cho nhân viên" (PAYMENT_SALARY_ADVANCE):
-- phiếu cũ (nếu có) quy về Chi khác, sau đó thu hẹp enum CashVoucherCategory.
UPDATE "cash_vouchers" SET "category" = 'PAYMENT' WHERE "category" = 'PAYMENT_SALARY_ADVANCE';

ALTER TYPE "CashVoucherCategory" RENAME TO "CashVoucherCategory_old";
CREATE TYPE "CashVoucherCategory" AS ENUM (
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
  ALTER COLUMN "category" TYPE "CashVoucherCategory"
  USING "category"::text::"CashVoucherCategory";
DROP TYPE "CashVoucherCategory_old";
