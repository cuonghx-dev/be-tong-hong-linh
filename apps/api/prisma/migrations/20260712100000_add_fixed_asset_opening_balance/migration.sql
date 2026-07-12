-- CreateTable
CREATE TABLE "fixed_asset_opening_balances" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT '',
    "original_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "depreciable_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "accumulated_depreciation" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "acquisition_date" DATE NOT NULL,
    "depreciation_date" DATE NOT NULL,
    "useful_life_months" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "remaining_months" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "asset_account" TEXT NOT NULL,
    "depreciation_account" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_asset_opening_balances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fixed_asset_opening_balances_code_key" ON "fixed_asset_opening_balances"("code");
