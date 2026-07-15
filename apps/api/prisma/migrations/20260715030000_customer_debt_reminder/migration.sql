-- Nhắc nợ tự động cho khách hàng còn công nợ (Tắt/Bật nhắc nợ tự động)
ALTER TABLE "customers" ADD COLUMN "debt_reminder_on" BOOLEAN NOT NULL DEFAULT true;
