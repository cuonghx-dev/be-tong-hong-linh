-- CreateEnum
CREATE TYPE "TransferSide" AS ENUM ('DEBIT', 'CREDIT', 'BOTH');

-- CreateTable
CREATE TABLE "transfer_accounts" (
    "id" TEXT NOT NULL,
    "transfer_order" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "from_account" TEXT NOT NULL,
    "to_account" TEXT NOT NULL,
    "side" "TransferSide" NOT NULL DEFAULT 'BOTH',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "transfer_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transfer_accounts_code_key" ON "transfer_accounts"("code");

-- CreateIndex
CREATE INDEX "transfer_accounts_transfer_order_idx" ON "transfer_accounts"("transfer_order");
