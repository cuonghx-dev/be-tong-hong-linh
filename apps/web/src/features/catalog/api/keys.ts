import type {
  AccountFilter,
  BankAccountFilter,
  BankFilter,
  CostObjectFilter,
  DefaultAccountFilter,
  EmployeeFilter,
  ExpenseItemFilter,
  IncomeExpenseItemFilter,
  OrganizationUnitFilter,
  PartnerGroupFilter,
  ProductFilter,
  ProductGroupFilter,
  TransferAccountFilter,
  UnitFilter,
  VoucherTypeFilter,
  WarehouseFilter,
} from '@app/shared'

// Query keys phân hệ Danh mục.
export const catalogKeys = {
  all: ['catalog'] as const,
  products: (filter: ProductFilter) => [...catalogKeys.all, 'products', filter] as const,
  product: (id: string) => [...catalogKeys.all, 'product', id] as const,
  warehouses: (filter: WarehouseFilter) => [...catalogKeys.all, 'warehouses', filter] as const,
  warehouse: (id: string) => [...catalogKeys.all, 'warehouse', id] as const,
  employees: (filter: EmployeeFilter) => [...catalogKeys.all, 'employees', filter] as const,
  employee: (id: string) => [...catalogKeys.all, 'employee', id] as const,
  banks: (filter: BankFilter) => [...catalogKeys.all, 'banks', filter] as const,
  bank: (id: string) => [...catalogKeys.all, 'bank', id] as const,
  bankAccounts: (filter: BankAccountFilter) =>
    [...catalogKeys.all, 'bank-accounts', filter] as const,
  bankAccount: (id: string) => [...catalogKeys.all, 'bank-account', id] as const,
  organizationUnits: (filter: OrganizationUnitFilter) =>
    [...catalogKeys.all, 'organization-units', filter] as const,
  organizationUnit: (id: string) => [...catalogKeys.all, 'organization-unit', id] as const,
  partnerGroups: (filter: PartnerGroupFilter) =>
    [...catalogKeys.all, 'partner-groups', filter] as const,
  partnerGroup: (id: string) => [...catalogKeys.all, 'partner-group', id] as const,
  productGroups: (filter: ProductGroupFilter) =>
    [...catalogKeys.all, 'product-groups', filter] as const,
  productGroup: (id: string) => [...catalogKeys.all, 'product-group', id] as const,
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
  defaultAccounts: (filter: DefaultAccountFilter) =>
    [...catalogKeys.all, 'default-accounts', filter] as const,
  defaultAccount: (id: string) => [...catalogKeys.all, 'default-account', id] as const,
  voucherTypes: (filter: VoucherTypeFilter) =>
    [...catalogKeys.all, 'voucher-types', filter] as const,
  voucherType: (id: string) => [...catalogKeys.all, 'voucher-type', id] as const,
  incomeExpenseItems: (filter: IncomeExpenseItemFilter) =>
    [...catalogKeys.all, 'income-expense-items', filter] as const,
  incomeExpenseItem: (id: string) =>
    [...catalogKeys.all, 'income-expense-item', id] as const,
  units: (filter: UnitFilter) => [...catalogKeys.all, 'units', filter] as const,
  unit: (id: string) => [...catalogKeys.all, 'unit', id] as const,
}
