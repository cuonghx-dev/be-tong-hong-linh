-- Backfill: partner_id/employee_id trên chứng từ là MÃ danh mục (FE hiển thị trực tiếp),
-- nhưng import Excel + chứng từ tự sinh trước đây ghi UUID row id. Đổi UUID → code.
-- Chỉ đụng các dòng khớp đúng row id trong danh mục (mã thường không phải UUID).

-- ── cash_vouchers ────────────────────────────────────────────────────────────
UPDATE cash_vouchers cv SET partner_id = c.code FROM customers c WHERE cv.partner_id = c.id;
UPDATE cash_vouchers cv SET partner_id = s.code FROM suppliers s WHERE cv.partner_id = s.id;
UPDATE cash_vouchers cv SET partner_id = e.code FROM employees e WHERE cv.partner_id = e.id;
UPDATE cash_vouchers cv SET employee_id = e.code FROM employees e WHERE cv.employee_id = e.id;

UPDATE cash_voucher_lines cl SET partner_id = c.code FROM customers c WHERE cl.partner_id = c.id;
UPDATE cash_voucher_lines cl SET partner_id = s.code FROM suppliers s WHERE cl.partner_id = s.id;
UPDATE cash_voucher_lines cl SET partner_id = e.code FROM employees e WHERE cl.partner_id = e.id;

-- ── bank_vouchers ────────────────────────────────────────────────────────────
UPDATE bank_vouchers bv SET partner_id = c.code FROM customers c WHERE bv.partner_id = c.id;
UPDATE bank_vouchers bv SET partner_id = s.code FROM suppliers s WHERE bv.partner_id = s.id;
UPDATE bank_vouchers bv SET partner_id = e.code FROM employees e WHERE bv.partner_id = e.id;
UPDATE bank_vouchers bv SET employee_id = e.code FROM employees e WHERE bv.employee_id = e.id;

UPDATE bank_voucher_lines bl SET partner_id = c.code FROM customers c WHERE bl.partner_id = c.id;
UPDATE bank_voucher_lines bl SET partner_id = s.code FROM suppliers s WHERE bl.partner_id = s.id;
UPDATE bank_voucher_lines bl SET partner_id = e.code FROM employees e WHERE bl.partner_id = e.id;

-- ── inventory_receipts ───────────────────────────────────────────────────────
UPDATE inventory_receipts ir SET partner_id = s.code FROM suppliers s WHERE ir.partner_id = s.id;
UPDATE inventory_receipts ir SET partner_id = c.code FROM customers c WHERE ir.partner_id = c.id;
