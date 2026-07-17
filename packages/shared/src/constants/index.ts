export * from './permissions'

// Mã tài khoản kế toán (TT 133/200) — bổ sung dần theo nghiệp vụ.

export const CHART_OF_ACCOUNTS = {
  CASH: '111', // Tiền mặt
  CASH_ON_HAND: '1111', // Tiền mặt Việt Nam (quỹ tiền mặt mặc định)
  BANK: '112', // Tiền gửi ngân hàng
  BANK_DEPOSIT: '1121', // Tiền gửi ngân hàng Việt Nam
  RECEIVABLE: '131', // Phải thu khách hàng
  PAYABLE: '331', // Phải trả người bán
  ADVANCE: '141', // Tạm ứng (thu hoàn ứng / tạm ứng cho nhân viên)
  LOAN: '1283', // Cho vay (thu hồi / chi cho vay)
  SALARY_PAYABLE: '334', // Phải trả người lao động (trả lương)
  INTERNAL_RECEIVABLE: '1368', // Phải thu nội bộ khác (chuyển tiền chi nhánh)
  CIT_PAYABLE: '3334', // Thuế thu nhập doanh nghiệp
  INVENTORY: '156', // Hàng hóa
  REVENUE: '511', // Doanh thu bán hàng
  REVENUE_GOODS: '5111', // Doanh thu bán hàng hóa
  REVENUE_SERVICE: '5112', // Doanh thu cung cấp dịch vụ
  VAT_OUTPUT: '3331', // Thuế GTGT đầu ra
  VAT_OUTPUT_DETAIL: '33311', // Thuế GTGT đầu ra hàng hóa, dịch vụ trong nước
  VAT_INPUT: '133', // Thuế GTGT đầu vào
  VAT_INPUT_DEDUCTIBLE: '1331', // Thuế GTGT đầu vào được khấu trừ (mua hàng)
  MATERIAL: '152', // Nguyên liệu, vật liệu
  TOOL: '153', // Công cụ, dụng cụ
  FINISHED_GOODS: '155', // Thành phẩm (nhập kho từ sản xuất)
  GOODS: '156', // Hàng hóa (nhập kho)
  WIP: '154', // Chi phí SXKD dở dang (kết chuyển thành phẩm)
  DIRECT_MATERIAL_COST: '621', // Chi phí nguyên vật liệu trực tiếp (xuất kho sản xuất)
  COGS: '632', // Giá vốn hàng bán (xuất kho bán hàng)
  SERVICE_EXPENSE: '642', // Chi phí quản lý DN (mua dịch vụ mặc định)
  // Tài sản cố định (06-tscd)
  FIXED_ASSET: '211', // TSCD hữu hình
  FIXED_ASSET_BUILDINGS: '21111', // Nhà cửa, vật kiến trúc
  FIXED_ASSET_MACHINERY: '21112', // Máy móc, thiết bị
  FIXED_ASSET_VEHICLES: '21113', // Phương tiện vận tải, truyền dẫn
  FIXED_ASSET_DEPRECIATION: '2141', // Hao mòn TSCD hữu hình
  OTHER_EXPENSE: '811', // Chi phí khác (giá trị còn lại khi ghi giảm TSCD)
} as const

// ── TK đối ứng ngầm định phiếu thu/chi tiền mặt theo loại nghiệp vụ (§5) ──────
// Thu: TK Nợ luôn 1111, map này là TK Có. Chi: TK Có luôn 1111, map này là TK Nợ.
// Loại không có trong map (Thu khác, Chi khác, chi mua ngoài có HĐ…) → tự nhập.
// Key = giá trị enum CashVoucherCategory (dùng chung FE form + BE import).

export const CASH_RECEIPT_CREDIT_ACCOUNT: Readonly<Record<string, string>> = {
  SALES_CASH: CHART_OF_ACCOUNTS.REVENUE_GOODS, // 5111 (bán hàng hóa thu tiền ngay)
  RECEIPT_BANK_WITHDRAW: CHART_OF_ACCOUNTS.BANK_DEPOSIT, // 1121
  RECEIPT_EMPLOYEE_ADVANCE: CHART_OF_ACCOUNTS.ADVANCE, // 141
  RECEIPT_CUSTOMER: CHART_OF_ACCOUNTS.RECEIVABLE, // 131
  RECEIPT_LOAN_RECOVERY: CHART_OF_ACCOUNTS.LOAN, // 1283
}

export const CASH_PAYMENT_DEBIT_ACCOUNT: Readonly<Record<string, string>> = {
  PAYMENT_EMPLOYEE_ADVANCE: CHART_OF_ACCOUNTS.ADVANCE, // 141
  DEPOSIT_TO_BANK: CHART_OF_ACCOUNTS.BANK_DEPOSIT, // 1121
  PAYMENT_SUPPLIER: CHART_OF_ACCOUNTS.PAYABLE, // 331
  PAYMENT_SALARY_ADVANCE: CHART_OF_ACCOUNTS.SALARY_PAYABLE, // 334
  PAYMENT_SALARY: CHART_OF_ACCOUNTS.SALARY_PAYABLE, // 334
  PAYMENT_TO_BRANCH: CHART_OF_ACCOUNTS.INTERNAL_RECEIVABLE, // 1368
  PAYMENT_LOAN: CHART_OF_ACCOUNTS.LOAN, // 1283
  PAYMENT_CIT_TAX: CHART_OF_ACCOUNTS.CIT_PAYABLE, // 3334
}
