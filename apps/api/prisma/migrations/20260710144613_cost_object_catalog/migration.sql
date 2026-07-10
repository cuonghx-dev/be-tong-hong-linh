-- CreateEnum
CREATE TYPE "CostObjectType" AS ENUM ('PRODUCT', 'WORKSHOP', 'OTHER');

-- CreateTable
CREATE TABLE "cost_objects" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CostObjectType" NOT NULL DEFAULT 'PRODUCT',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "cost_objects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cost_objects_code_key" ON "cost_objects"("code");

-- CreateIndex
CREATE INDEX "cost_objects_name_idx" ON "cost_objects"("name");
