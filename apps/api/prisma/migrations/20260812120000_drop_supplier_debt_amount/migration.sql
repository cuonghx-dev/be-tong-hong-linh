-- Review schema 2026-08-12 (mục 3): bỏ suppliers.debt_amount.
-- Cột chỉ được ghi 1 lần lúc nhập khẩu xlsx, không chứng từ/đối trừ nào cập nhật
-- → snapshot lệch ngay sau chứng từ đầu tiên, lừa người dùng là công nợ hiện tại.
-- Cột "Số tiền nợ" giờ tính runtime từ công nợ 331 (PurchaseReportService
-- .payableBalances = số dư khai báo partner_opening_balances + phát sinh chứng từ).
ALTER TABLE "suppliers" DROP COLUMN "debt_amount";
