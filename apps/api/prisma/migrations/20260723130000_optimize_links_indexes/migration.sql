-- Tối ưu liên kết khóa + index (review schema):
--  1. Bank ← BankAccount: thêm FK bank_id (SetNull), backfill từ bankName.
--  2. PurchaseVoucher → Supplier, GoodsIssueVoucher → Customer: FK thật (SetNull).
--  3. Mỗi bảng *_lines: @@unique(voucher_id/receipt_id, line_no) — chặn trùng số dòng
--     (thay index voucher_id thường; leading-column vẫn phục vụ join header-line).
--  4. Index item_id/warehouse_id trên bảng line — báo cáo tồn kho lọc trực tiếp.
--  5. Index posting_date riêng — sổ nhật ký chung lọc theo ngày, không theo type.
--  6. CHECK XOR nguồn tiền trên payment_allocations — đúng 1 trong cash/bank.

-- DropIndex (thay bằng unique leading-column phía dưới)
DROP INDEX "bank_voucher_lines_voucher_id_idx";
DROP INDEX "cash_voucher_lines_voucher_id_idx";
DROP INDEX "general_voucher_lines_voucher_id_idx";
DROP INDEX "goods_issue_lines_voucher_id_idx";
DROP INDEX "inventory_receipt_lines_receipt_id_idx";
DROP INDEX "purchase_voucher_lines_voucher_id_idx";
DROP INDEX "sales_voucher_lines_voucher_id_idx";

-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN     "bank_id" TEXT;

-- Backfill bank_id: khớp bankName với danh mục Bank (short_name hoặc full_name).
UPDATE "bank_accounts" ba
SET "bank_id" = b."id"
FROM "banks" b
WHERE ba."bank_id" IS NULL
  AND (b."short_name" = ba."bank_name" OR b."full_name" = ba."bank_name");

-- CreateIndex
CREATE INDEX "bank_accounts_bank_id_idx" ON "bank_accounts"("bank_id");
CREATE UNIQUE INDEX "bank_voucher_lines_voucher_id_line_no_key" ON "bank_voucher_lines"("voucher_id", "line_no");
CREATE INDEX "bank_vouchers_posting_date_idx" ON "bank_vouchers"("posting_date");
CREATE UNIQUE INDEX "cash_voucher_lines_voucher_id_line_no_key" ON "cash_voucher_lines"("voucher_id", "line_no");
CREATE INDEX "cash_vouchers_posting_date_idx" ON "cash_vouchers"("posting_date");
CREATE UNIQUE INDEX "general_voucher_lines_voucher_id_line_no_key" ON "general_voucher_lines"("voucher_id", "line_no");
CREATE INDEX "goods_issue_lines_item_id_warehouse_id_idx" ON "goods_issue_lines"("item_id", "warehouse_id");
CREATE UNIQUE INDEX "goods_issue_lines_voucher_id_line_no_key" ON "goods_issue_lines"("voucher_id", "line_no");
CREATE INDEX "goods_issue_vouchers_posting_date_idx" ON "goods_issue_vouchers"("posting_date");
CREATE INDEX "inventory_receipt_lines_item_id_warehouse_id_idx" ON "inventory_receipt_lines"("item_id", "warehouse_id");
CREATE UNIQUE INDEX "inventory_receipt_lines_receipt_id_line_no_key" ON "inventory_receipt_lines"("receipt_id", "line_no");
CREATE INDEX "purchase_voucher_lines_item_id_warehouse_id_idx" ON "purchase_voucher_lines"("item_id", "warehouse_id");
CREATE UNIQUE INDEX "purchase_voucher_lines_voucher_id_line_no_key" ON "purchase_voucher_lines"("voucher_id", "line_no");
CREATE INDEX "purchase_vouchers_posting_date_idx" ON "purchase_vouchers"("posting_date");
CREATE INDEX "sales_voucher_lines_item_id_idx" ON "sales_voucher_lines"("item_id");
CREATE UNIQUE INDEX "sales_voucher_lines_voucher_id_line_no_key" ON "sales_voucher_lines"("voucher_id", "line_no");
CREATE INDEX "sales_vouchers_posting_date_idx" ON "sales_vouchers"("posting_date");

-- AddForeignKey
ALTER TABLE "purchase_vouchers" ADD CONSTRAINT "purchase_vouchers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "goods_issue_vouchers" ADD CONSTRAINT "goods_issue_vouchers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CHECK XOR: nguồn tiền đối trừ đúng 1 trong 2 (phiếu thu TM / thu tiền gửi CK).
-- Prisma không hỗ trợ khai CHECK trong schema → thêm tay, migrate diff bỏ qua (không drift).
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_source_xor"
  CHECK (("cash_voucher_id" IS NULL) <> ("bank_voucher_id" IS NULL));
