-- CreateTable
CREATE TABLE "general_vouchers" (
    "id" TEXT NOT NULL,
    "voucher_no" TEXT NOT NULL,
    "posting_date" DATE NOT NULL,
    "voucher_date" DATE NOT NULL,
    "description" TEXT,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "branch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "general_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general_voucher_lines" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "description" TEXT,
    "debit_account" TEXT NOT NULL,
    "credit_account" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "partner_id" TEXT,
    "partner_name" TEXT,

    CONSTRAINT "general_voucher_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "general_vouchers_voucher_no_key" ON "general_vouchers"("voucher_no");

-- CreateIndex
CREATE INDEX "general_vouchers_posting_date_idx" ON "general_vouchers"("posting_date");

-- CreateIndex
CREATE INDEX "general_voucher_lines_voucher_id_idx" ON "general_voucher_lines"("voucher_id");

-- AddForeignKey
ALTER TABLE "general_voucher_lines" ADD CONSTRAINT "general_voucher_lines_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "general_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
