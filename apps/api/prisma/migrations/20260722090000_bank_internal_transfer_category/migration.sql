-- Thêm lý do thu "Chuyển tiền nội bộ" cho chứng từ tiền gửi.
ALTER TYPE "BankVoucherCategory" ADD VALUE 'INTERNAL_TRANSFER' AFTER 'RECEIPT';
