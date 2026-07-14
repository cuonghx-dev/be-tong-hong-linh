-- CreateEnum
CREATE TYPE "OrgUnitLevel" AS ENUM ('COMPANY', 'BRANCH', 'DEPARTMENT');

-- CreateTable
CREATE TABLE "organization_units" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "level" "OrgUnitLevel" NOT NULL DEFAULT 'DEPARTMENT',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "organization_units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_units_code_key" ON "organization_units"("code");

-- CreateIndex
CREATE INDEX "organization_units_name_idx" ON "organization_units"("name");
