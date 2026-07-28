-- Chuyển tiền nội bộ (CTNB) thành loại chứng từ tiền gửi riêng (ngang NTTK/UNC).
ALTER TYPE "BankVoucherType" ADD VALUE 'TRANSFER';

-- Tên ngân hàng của tài khoản đến — chỉ dùng cho CTNB.
ALTER TABLE "bank_vouchers" ADD COLUMN "receiver_bank_name" TEXT;
