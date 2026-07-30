-- Phiếu xuất kho lý do "Sản xuất" (MISA): cụm Mã/Tên người nhận + Bộ phận thay
-- cụm khách hàng, dòng hàng có cột Thành phẩm thay Số lô.
ALTER TABLE "goods_issue_vouchers" ADD COLUMN "receiver_id" TEXT;
ALTER TABLE "goods_issue_vouchers" ADD COLUMN "department" TEXT;
ALTER TABLE "goods_issue_lines" ADD COLUMN "finished_product" TEXT;
