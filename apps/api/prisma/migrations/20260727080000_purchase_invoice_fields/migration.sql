-- Tab Hóa đơn chứng từ mua hàng: mẫu số / ký hiệu / ngày hóa đơn (invoice_no đã có sẵn)
ALTER TABLE "purchase_vouchers"
  ADD COLUMN "invoice_template" TEXT,
  ADD COLUMN "invoice_series" TEXT,
  ADD COLUMN "invoice_date" DATE;
