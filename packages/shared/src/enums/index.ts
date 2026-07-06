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
