-- Trạng thái theo dõi khách hàng (Ngừng sử dụng / Sử dụng)
ALTER TABLE "customers" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
