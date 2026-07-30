-- Tab Giá vốn chứng từ bán hàng: kho xuất, TK giá vốn, TK kho, đơn giá vốn nhập tay.
ALTER TABLE "sales_voucher_lines"
  ADD COLUMN "warehouse_id" TEXT,
  ADD COLUMN "cost_account" TEXT,
  ADD COLUMN "inventory_account" TEXT,
  ADD COLUMN "cost_price" DECIMAL(18,2) NOT NULL DEFAULT 0;
