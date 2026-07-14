-- Ngừng sử dụng nhà cung cấp: ẩn khỏi picker khi lập chứng từ mới.
ALTER TABLE "suppliers" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
