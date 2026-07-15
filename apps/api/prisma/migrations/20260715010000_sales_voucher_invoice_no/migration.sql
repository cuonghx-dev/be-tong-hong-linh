-- Số hóa đơn của chứng từ bán hàng (cột "Số hóa đơn" trong Ban_hang.xlsx).
ALTER TABLE "sales_vouchers" ADD COLUMN "invoice_no" TEXT;
