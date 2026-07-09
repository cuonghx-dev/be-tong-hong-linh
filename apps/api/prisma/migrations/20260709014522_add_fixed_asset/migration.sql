-- CreateEnum
CREATE TYPE "FixedAssetStatus" AS ENUM ('IN_USE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" TEXT NOT NULL,
    "voucher_no" TEXT,
    "asset_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_type" TEXT,
    "department" TEXT,
    "description" TEXT,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "increase_date" DATE,
    "depreciation_start_date" DATE,
    "useful_life_months" INTEGER NOT NULL DEFAULT 0,
    "remaining_months" INTEGER NOT NULL DEFAULT 0,
    "original_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "depreciable_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "accumulated_depreciation" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "residual_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "monthly_depreciation" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cost_account" TEXT,
    "depreciation_account" TEXT,
    "status" "FixedAssetStatus" NOT NULL DEFAULT 'IN_USE',
    "branch_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_voucher_no_key" ON "fixed_assets"("voucher_no");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_asset_code_key" ON "fixed_assets"("asset_code");

-- CreateIndex
CREATE INDEX "fixed_assets_increase_date_idx" ON "fixed_assets"("increase_date");

-- CreateIndex
CREATE INDEX "fixed_assets_asset_type_idx" ON "fixed_assets"("asset_type");

-- CreateIndex
CREATE INDEX "fixed_assets_status_idx" ON "fixed_assets"("status");
