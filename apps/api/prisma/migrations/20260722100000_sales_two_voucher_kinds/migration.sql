-- Thu hẹp bán hàng về 2 loại chứng từ MISA:
--   "Bán hàng hóa trong nước - Tiền mặt" (PAID_NOW, phiếu thu tự sinh) và
--   "Bán hàng hóa trong nước chưa thu tiền" (UNPAID).
-- Bỏ loại bán dịch vụ (DOMESTIC_SERVICE) + luồng thu ngay chuyển khoản
-- (payment_method, thu tiền gửi SALES_BANK tự sinh, TKNH nhận tiền).
-- Dữ liệu hiện có: 0 dòng DOMESTIC_SERVICE, 0 SALES_BANK, 0 bank_receipt_id — xóa an toàn.

ALTER TABLE "sales_vouchers"
  DROP COLUMN "payment_method",
  DROP COLUMN "bank_receipt_id",
  DROP COLUMN "bank_account_no",
  DROP COLUMN "bank_name";

-- Postgres không hỗ trợ DROP VALUE trên enum → tạo type mới rồi swap.
CREATE TYPE "SalesVoucherType_new" AS ENUM ('DOMESTIC_GOODS');
ALTER TABLE "sales_vouchers"
  ALTER COLUMN "voucher_type" TYPE "SalesVoucherType_new" USING ("voucher_type"::text::"SalesVoucherType_new");
DROP TYPE "SalesVoucherType";
ALTER TYPE "SalesVoucherType_new" RENAME TO "SalesVoucherType";

CREATE TYPE "BankVoucherCategory_new" AS ENUM ('RECEIPT', 'INTERNAL_TRANSFER', 'PAYMENT');
ALTER TABLE "bank_vouchers"
  ALTER COLUMN "category" TYPE "BankVoucherCategory_new" USING ("category"::text::"BankVoucherCategory_new");
DROP TYPE "BankVoucherCategory";
ALTER TYPE "BankVoucherCategory_new" RENAME TO "BankVoucherCategory";
