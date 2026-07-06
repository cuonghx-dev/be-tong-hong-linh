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
