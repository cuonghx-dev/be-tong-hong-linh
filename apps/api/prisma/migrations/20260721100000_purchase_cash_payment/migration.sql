-- Phiếu chi tự sinh từ chứng từ mua hàng thanh toán ngay tiền mặt
-- (mirror receipt_id bên bán hàng — tham chiếu lỏng, không FK).
ALTER TABLE "purchase_vouchers" ADD COLUMN "payment_id" TEXT;
