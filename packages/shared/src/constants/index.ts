// Mã tài khoản kế toán (TT 133/200) — bổ sung dần theo nghiệp vụ.

export const CHART_OF_ACCOUNTS = {
  CASH: '111', // Tiền mặt
  CASH_ON_HAND: '1111', // Tiền mặt Việt Nam (quỹ tiền mặt mặc định)
  BANK: '112', // Tiền gửi ngân hàng
  BANK_DEPOSIT: '1121', // Tiền gửi ngân hàng Việt Nam
  RECEIVABLE: '131', // Phải thu khách hàng
  PAYABLE: '331', // Phải trả người bán
  INVENTORY: '156', // Hàng hóa
  REVENUE: '511', // Doanh thu bán hàng
  REVENUE_GOODS: '5111', // Doanh thu bán hàng hóa
  REVENUE_SERVICE: '5112', // Doanh thu cung cấp dịch vụ
  VAT_OUTPUT: '3331', // Thuế GTGT đầu ra
  VAT_OUTPUT_DETAIL: '33311', // Thuế GTGT đầu ra hàng hóa, dịch vụ trong nước
  VAT_INPUT: '133', // Thuế GTGT đầu vào
  VAT_INPUT_DEDUCTIBLE: '1331', // Thuế GTGT đầu vào được khấu trừ (mua hàng)
  MATERIAL: '152', // Nguyên liệu, vật liệu
  GOODS: '156', // Hàng hóa (nhập kho)
  SERVICE_EXPENSE: '642', // Chi phí quản lý DN (mua dịch vụ mặc định)
} as const
