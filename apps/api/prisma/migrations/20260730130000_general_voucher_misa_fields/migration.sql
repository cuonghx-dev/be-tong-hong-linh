-- Chứng từ nghiệp vụ khác: bổ sung Hạn thanh toán + Tham chiếu (theo form MISA).
ALTER TABLE "general_vouchers" ADD COLUMN "due_date" DATE;
ALTER TABLE "general_vouchers" ADD COLUMN "reference_no" TEXT;

-- Đối tượng tách theo vế bút toán: partner_* cũ là đối tượng vế Nợ.
ALTER TABLE "general_voucher_lines" RENAME COLUMN "partner_id" TO "debit_partner_id";
ALTER TABLE "general_voucher_lines" RENAME COLUMN "partner_name" TO "debit_partner_name";
ALTER TABLE "general_voucher_lines" ADD COLUMN "credit_partner_id" TEXT;
ALTER TABLE "general_voucher_lines" ADD COLUMN "credit_partner_name" TEXT;
