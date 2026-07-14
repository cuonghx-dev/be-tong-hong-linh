-- Cờ ghi sổ cho chứng từ mua hàng. Chứng từ hiện có coi như đã ghi sổ (default true).
ALTER TABLE "purchase_vouchers" ADD COLUMN "posted" BOOLEAN NOT NULL DEFAULT true;
