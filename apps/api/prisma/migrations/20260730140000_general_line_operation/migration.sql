-- Cột "Nghiệp vụ" trên dòng hạch toán NVK — text tự do (như cash_voucher_lines.operation).
ALTER TABLE "general_voucher_lines" ADD COLUMN "operation" TEXT;
