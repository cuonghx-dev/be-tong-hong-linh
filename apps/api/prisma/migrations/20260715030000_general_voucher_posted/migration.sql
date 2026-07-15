-- Cờ ghi sổ cho chứng từ nghiệp vụ khác. Chứng từ hiện có coi như đã ghi sổ (default true).
ALTER TABLE "general_vouchers" ADD COLUMN "posted" BOOLEAN NOT NULL DEFAULT true;
