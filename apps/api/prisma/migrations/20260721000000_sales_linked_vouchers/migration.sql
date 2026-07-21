-- Chứng từ tự sinh từ bán hàng: thu tiền gửi (NTTK) + phiếu xuất kho (XK),
-- và TKNH nhận tiền khi thu tiền ngay chuyển khoản.
ALTER TABLE "sales_vouchers" ADD COLUMN "bank_receipt_id" TEXT;
ALTER TABLE "sales_vouchers" ADD COLUMN "issue_id" TEXT;
ALTER TABLE "sales_vouchers" ADD COLUMN "bank_account_no" TEXT;
ALTER TABLE "sales_vouchers" ADD COLUMN "bank_name" TEXT;
