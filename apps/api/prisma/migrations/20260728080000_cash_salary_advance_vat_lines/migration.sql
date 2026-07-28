-- Loại nghiệp vụ PC mới: Trả lương tạm ứng cho nhân viên (Nợ 3341 / Có 1111).
ALTER TYPE "CashVoucherCategory" ADD VALUE IF NOT EXISTS 'PAYMENT_SALARY_ADVANCE' BEFORE 'PAYMENT';

-- Dòng thuế GTGT trên phiếu chi (tab "Kê khai hóa đơn và hạch toán thuế").
ALTER TABLE "cash_voucher_lines"
  ADD COLUMN "is_vat_line" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "has_invoice" BOOLEAN,
  ADD COLUMN "vat_rate" DECIMAL(5,2),
  ADD COLUMN "invoice_date" DATE,
  ADD COLUMN "invoice_no" TEXT,
  ADD COLUMN "goods_service_group" TEXT,
  ADD COLUMN "supplier_tax_code" TEXT;
