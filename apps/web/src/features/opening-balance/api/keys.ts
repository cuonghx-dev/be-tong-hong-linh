// Query keys phân hệ Số dư ban đầu.
export const openingBalanceKeys = {
  all: ['opening-balance'] as const,
  accounts: () => [...openingBalanceKeys.all, 'accounts'] as const,
}
