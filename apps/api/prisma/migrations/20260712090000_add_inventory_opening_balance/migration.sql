-- CreateTable
CREATE TABLE "inventory_opening_balances" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "warehouse_code" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_opening_balances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_opening_balances_product_id_warehouse_code_key" ON "inventory_opening_balances"("product_id", "warehouse_code");

-- AddForeignKey
ALTER TABLE "inventory_opening_balances" ADD CONSTRAINT "inventory_opening_balances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
