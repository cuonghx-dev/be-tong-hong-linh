import type { AccountLedgerFilter, GeneralJournalFilter } from '@app/shared'

// Query keys báo cáo Tổng hợp.
export const reportKeys = {
  all: ['report'] as const,
  journal: (filter: GeneralJournalFilter) =>
    [...reportKeys.all, 'general-journal', filter] as const,
  ledger: (filter: AccountLedgerFilter) => [...reportKeys.all, 'account-ledger', filter] as const,
}
