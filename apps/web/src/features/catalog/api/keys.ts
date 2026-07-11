import type {
  AccountFilter,
  BankAccountFilter,
  BankFilter,
  CostObjectFilter,
  EmployeeFilter,
  ExpenseItemFilter,
  PartnerGroupFilter,
  TransferAccountFilter,
} from '@app/shared'

// Query keys phân hệ Danh mục.
export const catalogKeys = {
  all: ['catalog'] as const,
  employees: (filter: EmployeeFilter) => [...catalogKeys.all, 'employees', filter] as const,
  employee: (id: string) => [...catalogKeys.all, 'employee', id] as const,
  banks: (filter: BankFilter) => [...catalogKeys.all, 'banks', filter] as const,
  bank: (id: string) => [...catalogKeys.all, 'bank', id] as const,
  bankAccounts: (filter: BankAccountFilter) =>
    [...catalogKeys.all, 'bank-accounts', filter] as const,
  bankAccount: (id: string) => [...catalogKeys.all, 'bank-account', id] as const,
  partnerGroups: (filter: PartnerGroupFilter) =>
    [...catalogKeys.all, 'partner-groups', filter] as const,
  partnerGroup: (id: string) => [...catalogKeys.all, 'partner-group', id] as const,
  costObjects: (filter: CostObjectFilter) =>
    [...catalogKeys.all, 'cost-objects', filter] as const,
  costObject: (id: string) => [...catalogKeys.all, 'cost-object', id] as const,
  expenseItems: (filter: ExpenseItemFilter) =>
    [...catalogKeys.all, 'expense-items', filter] as const,
  expenseItem: (id: string) => [...catalogKeys.all, 'expense-item', id] as const,
  accounts: (filter: AccountFilter) => [...catalogKeys.all, 'accounts', filter] as const,
  account: (id: string) => [...catalogKeys.all, 'account', id] as const,
  transferAccounts: (filter: TransferAccountFilter) =>
    [...catalogKeys.all, 'transfer-accounts', filter] as const,
  transferAccount: (id: string) => [...catalogKeys.all, 'transfer-account', id] as const,
}
