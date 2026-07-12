// Query keys phân hệ Số dư ban đầu.
export const openingBalanceKeys = {
  all: ['opening-balance'] as const,
  accounts: () => [...openingBalanceKeys.all, 'accounts'] as const,
  partners: (accountCode: string) =>
    [...openingBalanceKeys.all, 'partners', accountCode] as const,
  bankAccounts: (accountCode: string) =>
    [...openingBalanceKeys.all, 'bank-accounts', accountCode] as const,
}
