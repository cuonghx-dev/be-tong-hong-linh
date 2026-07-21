-- Chứng từ tự sinh còn lại của mua hàng (mirror sales_linked_vouchers):
--   trả ngay CK → UNC chi tiền gửi (bank_payment_id), nhập kho → phiếu nhập kho
--   (receipt_id, chung số NK). TKNH chi tiền khi trả ngay chuyển khoản.
ALTER TABLE "purchase_vouchers"
  ADD COLUMN "bank_payment_id" TEXT,
  ADD COLUMN "receipt_id" TEXT,
  ADD COLUMN "bank_account_no" TEXT,
  ADD COLUMN "bank_name" TEXT;
