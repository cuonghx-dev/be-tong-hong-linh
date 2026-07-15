-- Ghi sổ / bỏ ghi phiếu nhập kho: bỏ ghi = loại khỏi sổ sách nhưng không xóa dữ liệu.
ALTER TABLE "inventory_receipts" ADD COLUMN "posted" BOOLEAN NOT NULL DEFAULT true;
