-- Cờ ghi sổ / bỏ ghi phiếu xuất kho (bỏ ghi = loại khỏi sổ sách, không xóa dữ liệu).
ALTER TABLE "goods_issue_vouchers" ADD COLUMN "posted" BOOLEAN NOT NULL DEFAULT true;
