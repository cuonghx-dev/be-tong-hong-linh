// Mã tài khoản kế toán (TT 133/200) — bổ sung dần theo nghiệp vụ.

export const CHART_OF_ACCOUNTS = {
  CASH: '111', // Tiền mặt
  BANK: '112', // Tiền gửi ngân hàng
  RECEIVABLE: '131', // Phải thu khách hàng
  PAYABLE: '331', // Phải trả người bán
  INVENTORY: '156', // Hàng hóa
  REVENUE: '511', // Doanh thu bán hàng
  VAT_OUTPUT: '3331', // Thuế GTGT đầu ra
  VAT_INPUT: '133', // Thuế GTGT đầu vào
} as const
