-- Cờ ghi sổ cho chứng từ bán hàng. Chứng từ hiện có coi như đã ghi sổ (default true).
ALTER TABLE "sales_vouchers" ADD COLUMN "posted" BOOLEAN NOT NULL DEFAULT true;
