-- CreateTable
CREATE TABLE "fixed_asset_disposals" (
    "id" TEXT NOT NULL,
    "voucher_no" TEXT NOT NULL,
    "posting_date" DATE NOT NULL,
    "voucher_date" DATE NOT NULL,
    "reason" TEXT,
    "branch_name" TEXT,
    "total_original_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_accumulated" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_residual" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "fixed_asset_disposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_asset_disposal_lines" (
    "id" TEXT NOT NULL,
    "disposal_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "asset_id" TEXT,
    "asset_code" TEXT,
    "asset_name" TEXT,
    "original_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "accumulated_depreciation" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "residual_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "debit_account" TEXT,
    "credit_account" TEXT,

    CONSTRAINT "fixed_asset_disposal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fixed_asset_disposals_voucher_no_key" ON "fixed_asset_disposals"("voucher_no");

-- CreateIndex
CREATE INDEX "fixed_asset_disposals_posting_date_idx" ON "fixed_asset_disposals"("posting_date");

-- CreateIndex
CREATE INDEX "fixed_asset_disposal_lines_disposal_id_idx" ON "fixed_asset_disposal_lines"("disposal_id");

-- CreateIndex
CREATE INDEX "fixed_asset_disposal_lines_asset_id_idx" ON "fixed_asset_disposal_lines"("asset_id");

-- AddForeignKey
ALTER TABLE "fixed_asset_disposal_lines" ADD CONSTRAINT "fixed_asset_disposal_lines_disposal_id_fkey" FOREIGN KEY ("disposal_id") REFERENCES "fixed_asset_disposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
