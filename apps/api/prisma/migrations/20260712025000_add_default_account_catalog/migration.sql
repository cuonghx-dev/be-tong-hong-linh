-- CreateTable
CREATE TABLE "default_accounts" (
    "id" TEXT NOT NULL,
    "default_order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "debit_account" TEXT,
    "credit_account" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "default_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "default_accounts_default_order_idx" ON "default_accounts"("default_order");

-- CreateIndex
CREATE INDEX "default_accounts_name_idx" ON "default_accounts"("name");
