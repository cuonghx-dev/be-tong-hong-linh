-- Xuất kho chỉ còn 2 loại chứng từ: SALES (xuất kho bán hàng)
-- và PRODUCTION (xuất kho cho sản xuất). Xóa OTHER.
-- Dữ liệu hiện có chỉ chứa SALES/PRODUCTION (đã kiểm tra) — không cần remap.

ALTER TABLE "goods_issue_vouchers" ALTER COLUMN "category" DROP DEFAULT;

CREATE TYPE "GoodsIssueCategory_new" AS ENUM ('SALES', 'PRODUCTION');

ALTER TABLE "goods_issue_vouchers"
  ALTER COLUMN "category" TYPE "GoodsIssueCategory_new"
  USING ("category"::text::"GoodsIssueCategory_new");

DROP TYPE "GoodsIssueCategory";

ALTER TYPE "GoodsIssueCategory_new" RENAME TO "GoodsIssueCategory";

ALTER TABLE "goods_issue_vouchers" ALTER COLUMN "category" SET DEFAULT 'SALES';
