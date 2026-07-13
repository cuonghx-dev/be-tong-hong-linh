-- Cờ ghi sổ cho phiếu thu/chi. Chứng từ hiện có coi như đã ghi sổ (default true).
ALTER TABLE "cash_vouchers" ADD COLUMN "posted" BOOLEAN NOT NULL DEFAULT true;
