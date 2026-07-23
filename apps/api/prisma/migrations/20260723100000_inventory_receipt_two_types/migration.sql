-- Nhập kho chỉ còn 2 loại chứng từ: PURCHASE (mua hàng trong nước chưa thanh toán)
-- và FINISHED_GOODS (nhập kho thành phẩm sản xuất). Xóa SALES_RETURN, OTHER.
-- Dữ liệu hiện có chỉ chứa PURCHASE (đã kiểm tra) — không cần remap.

ALTER TABLE "inventory_receipts" ALTER COLUMN "receipt_type" DROP DEFAULT;

CREATE TYPE "InventoryReceiptType_new" AS ENUM ('PURCHASE', 'FINISHED_GOODS');

ALTER TABLE "inventory_receipts"
  ALTER COLUMN "receipt_type" TYPE "InventoryReceiptType_new"
  USING ("receipt_type"::text::"InventoryReceiptType_new");

DROP TYPE "InventoryReceiptType";

ALTER TYPE "InventoryReceiptType_new" RENAME TO "InventoryReceiptType";

ALTER TABLE "inventory_receipts" ALTER COLUMN "receipt_type" SET DEFAULT 'PURCHASE';
