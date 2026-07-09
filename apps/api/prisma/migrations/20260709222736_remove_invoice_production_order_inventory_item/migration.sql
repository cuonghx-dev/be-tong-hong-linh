-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_sales_voucher_id_fkey";

-- DropForeignKey
ALTER TABLE "production_order_lines" DROP CONSTRAINT "production_order_lines_order_id_fkey";

-- DropTable
DROP TABLE "inventory_items";

-- DropTable
DROP TABLE "invoices";

-- DropTable
DROP TABLE "production_order_lines";

-- DropTable
DROP TABLE "production_orders";

-- DropEnum
DROP TYPE "InvoiceIssueStatus";

-- DropEnum
DROP TYPE "ItemNature";

-- DropEnum
DROP TYPE "ItemTaxReduction";

-- DropEnum
DROP TYPE "ProductionOrderLineType";

-- DropEnum
DROP TYPE "ProductionOrderStatus";

