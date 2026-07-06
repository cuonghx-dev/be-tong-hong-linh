// Enum nghiệp vụ kế toán — dùng chung FE ↔ BE.

export enum PaymentMethod {
  Cash = 'CASH',
  BankTransfer = 'BANK_TRANSFER',
}

export enum InvoiceStatus {
  Draft = 'DRAFT',
  Posted = 'POSTED',
  Cancelled = 'CANCELLED',
}

export enum AccountType {
  Asset = 'ASSET',
  Liability = 'LIABILITY',
  Equity = 'EQUITY',
  Revenue = 'REVENUE',
  Expense = 'EXPENSE',
}

// Tiền mặt (01-tien-mat) ------------------------------------------------------

// Loại chứng từ quỹ: Phiếu thu (PT) tăng quỹ / Phiếu chi (PC) giảm quỹ.
export enum CashVoucherType {
  Receipt = 'RECEIPT', // Phiếu thu (PT)
  Payment = 'PAYMENT', // Phiếu chi (PC)
}

// Loại nghiệp vụ (§5) — quyết định định khoản mặc định + nguồn sinh phiếu.
export enum CashVoucherCategory {
  SalesCash = 'SALES_CASH', // Bán hàng hóa trong nước - Tiền mặt (PT tự sinh)
  Receipt = 'RECEIPT', // Phiếu thu nhập tay (thu khác)
  Payment = 'PAYMENT', // Phiếu chi nhập tay (chi khác)
  PurchaseServiceCash = 'PURCHASE_SERVICE_CASH', // Chứng từ mua dịch vụ - Tiền mặt (PC tự sinh)
  PurchaseGoodsCash = 'PURCHASE_GOODS_CASH', // Mua hàng trong nước không qua kho - Tiền mặt (PC tự sinh)
  DepositToBank = 'DEPOSIT_TO_BANK', // Gửi tiền vào ngân hàng (PC loại 3)
}

// Đối tượng liên kết chứng từ: Khách hàng / Nhà cung cấp / Nhân viên.
export enum PartnerType {
  Customer = 'CUSTOMER',
  Supplier = 'SUPPLIER',
  Employee = 'EMPLOYEE',
}

// Tiền gửi (02-tien-gui) ------------------------------------------------------

// Loại chứng từ tiền gửi: Thu tiền gửi (NTTK) tăng / Ủy nhiệm chi (UNC) giảm.
export enum BankVoucherType {
  Receipt = 'RECEIPT', // Thu tiền gửi (NTTK)
  Payment = 'PAYMENT', // Ủy nhiệm chi (UNC)
}

// Loại nghiệp vụ (§5) — quyết định định khoản mặc định + nguồn sinh phiếu.
export enum BankVoucherCategory {
  Receipt = 'RECEIPT', // Thu tiền gửi nhập tay (thu khác)
  Payment = 'PAYMENT', // Ủy nhiệm chi nhập tay (chi khác)
  SalesBank = 'SALES_BANK', // Bán hàng - chuyển khoản (NTTK tự sinh)
  PurchaseServiceBank = 'PURCHASE_SERVICE_BANK', // Mua dịch vụ - chuyển khoản (UNC tự sinh)
  PurchaseGoodsBank = 'PURCHASE_GOODS_BANK', // Mua hàng - chuyển khoản (UNC tự sinh)
}

// Phương thức thanh toán khi chi (§4) — chỉ dùng cho UNC.
export enum BankPaymentMethod {
  UNC = 'UNC', // Ủy nhiệm chi
  Transfer = 'TRANSFER', // Chuyển khoản
  Check = 'CHECK', // Séc
}

// Mua hàng (03-mua-hang) ------------------------------------------------------

// Loại chứng từ mua hàng (§5) — quyết định định khoản + cột bảng + prefix số.
export enum PurchaseVoucherType {
  Stock = 'STOCK', // Mua hàng trong nước nhập kho (NK) → có TK Kho
  NonStock = 'NON_STOCK', // Mua hàng trong nước không qua kho (MH)
  Service = 'SERVICE', // Mua dịch vụ (MDV)
}

// Hình thức thanh toán khi lập chứng từ (§4 - Tùy chọn đầu form).
export enum PurchasePaymentMode {
  Unpaid = 'UNPAID', // Chưa thanh toán → sinh công nợ 331
  Immediate = 'IMMEDIATE', // Thanh toán ngay → Có 1111/1121
}

// Trạng thái nhận hóa đơn (cột TT nhận hóa đơn).
export enum PurchaseReceiveStatus {
  NotReceived = 'NOT_RECEIVED', // Chưa nhận HĐ
  Received = 'RECEIVED', // Đã nhận HĐ
}

// Trạng thái thanh toán công nợ (cột TT thanh toán).
export enum PurchasePaymentStatus {
  Unpaid = 'UNPAID', // Chưa thanh toán
  Partial = 'PARTIAL', // Thanh toán một phần
  Paid = 'PAID', // Đã thanh toán
}

// Loại nhà cung cấp: Tổ chức / Cá nhân.
export enum SupplierType {
  Organization = 'ORG',
  Individual = 'INDIVIDUAL',
}

// Bán hàng (04-ban-hang) ------------------------------------------------------

// Loại nghiệp vụ chứng từ bán hàng (§3) — quyết định TK doanh thu mặc định.
export enum SalesVoucherType {
  DomesticGoods = 'DOMESTIC_GOODS', // Bán hàng hóa trong nước (TK 5111)
  DomesticService = 'DOMESTIC_SERVICE', // Bán dịch vụ trong nước (TK 5112)
}

// Tùy chọn thanh toán (§3) — quyết định định khoản TK Nợ + sinh phiếu thu.
export enum SalesPaymentMode {
  Unpaid = 'UNPAID', // Chưa thu tiền → công nợ 131
  PaidNow = 'PAID_NOW', // Thu tiền ngay → Nợ 1111/1121, sinh phiếu thu
}

// Trạng thái phát hành hóa đơn điện tử (§5).
export enum InvoiceIssueStatus {
  Unissued = 'UNISSUED', // Chưa phát hành
  CodeIssued = 'CODE_ISSUED', // Đã cấp mã (có mã CQT)
}

// Loại đối tượng khách hàng (§8): Tổ chức / Cá nhân.
export enum CustomerType {
  Organization = 'ORG',
  Individual = 'INDIVIDUAL',
}
