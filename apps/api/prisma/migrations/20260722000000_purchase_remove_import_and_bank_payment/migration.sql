-- Thu hẹp mua hàng về 4 loại chứng từ MISA (trong nước, trả ngay chỉ tiền mặt):
--   bỏ luồng UNC tự sinh (bank_payment_id + TKNH chi tiền trên chứng từ mua),
--   bỏ nguồn gốc nhập khẩu (IMPORT) và loại nghiệp vụ UNC mua hàng.
-- Dữ liệu hiện có: 0 dòng IMPORT, 0 UNC mua hàng, 0 bank_payment_id — xóa an toàn.

ALTER TABLE "purchase_vouchers"
  DROP COLUMN "bank_payment_id",
  DROP COLUMN "bank_account_no",
  DROP COLUMN "bank_name";

-- Postgres không hỗ trợ DROP VALUE trên enum → tạo type mới rồi swap.
CREATE TYPE "PurchaseOrigin_new" AS ENUM ('DOMESTIC');
ALTER TABLE "purchase_vouchers" ALTER COLUMN "origin" DROP DEFAULT;
ALTER TABLE "purchase_vouchers"
  ALTER COLUMN "origin" TYPE "PurchaseOrigin_new" USING ("origin"::text::"PurchaseOrigin_new");
DROP TYPE "PurchaseOrigin";
ALTER TYPE "PurchaseOrigin_new" RENAME TO "PurchaseOrigin";
ALTER TABLE "purchase_vouchers" ALTER COLUMN "origin" SET DEFAULT 'DOMESTIC';

CREATE TYPE "BankVoucherCategory_new" AS ENUM ('RECEIPT', 'INTERNAL_TRANSFER', 'PAYMENT', 'SALES_BANK');
ALTER TABLE "bank_vouchers"
  ALTER COLUMN "category" TYPE "BankVoucherCategory_new" USING ("category"::text::"BankVoucherCategory_new");
DROP TYPE "BankVoucherCategory";
ALTER TYPE "BankVoucherCategory_new" RENAME TO "BankVoucherCategory";
