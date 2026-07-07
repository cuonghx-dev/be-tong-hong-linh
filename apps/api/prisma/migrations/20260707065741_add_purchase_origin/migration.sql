-- CreateEnum
CREATE TYPE "PurchaseOrigin" AS ENUM ('DOMESTIC', 'IMPORT');

-- AlterTable
ALTER TABLE "purchase_vouchers" ADD COLUMN     "origin" "PurchaseOrigin" NOT NULL DEFAULT 'DOMESTIC';
