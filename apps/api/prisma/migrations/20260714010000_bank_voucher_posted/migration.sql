-- Cờ ghi sổ cho chứng từ tiền gửi. Chứng từ hiện có coi như đã ghi sổ (default true).
ALTER TABLE "bank_vouchers" ADD COLUMN "posted" BOOLEAN NOT NULL DEFAULT true;
