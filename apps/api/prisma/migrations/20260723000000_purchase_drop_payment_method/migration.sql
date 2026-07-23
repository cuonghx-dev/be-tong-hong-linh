-- Bỏ hình thức thanh toán trên chứng từ mua hàng: trả ngay giờ chỉ còn tiền mặt
-- (PC tự sinh) nên cột payment_method thừa. Enum "PaymentMethod" giữ lại cho
-- luồng thu tiền khách hàng (đối trừ công nợ) phía bán hàng.
ALTER TABLE "purchase_vouchers" DROP COLUMN "payment_method";
