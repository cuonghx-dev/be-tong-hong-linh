-- Review schema 2026-08-12 (mục 1+2):
--  1. inventory_receipts: thêm index posting_date — sổ nhật ký chung filter chỉ theo
--     posting_date (không receiptType); composite [receipt_type, posting_date] không phủ.
--  2. Index phục vụ nextVoucherNo (đánh số chứng từ MAX+1 theo năm):
--     cash/bank/purchase lọc {type, voucher_date}; sales/general lọc {voucher_date}.
--     Trước đây không index nào phủ voucher_date → seq scan mỗi lần tạo chứng từ.

-- 1. inventory_receipts
CREATE INDEX "inventory_receipts_posting_date_idx" ON "inventory_receipts"("posting_date");

-- 2. voucher_date cho nextVoucherNo
CREATE INDEX "cash_vouchers_type_voucher_date_idx" ON "cash_vouchers"("type", "voucher_date");
CREATE INDEX "bank_vouchers_type_voucher_date_idx" ON "bank_vouchers"("type", "voucher_date");
CREATE INDEX "purchase_vouchers_type_voucher_date_idx" ON "purchase_vouchers"("type", "voucher_date");
CREATE INDEX "sales_vouchers_voucher_date_idx" ON "sales_vouchers"("voucher_date");
CREATE INDEX "general_vouchers_voucher_date_idx" ON "general_vouchers"("voucher_date");
