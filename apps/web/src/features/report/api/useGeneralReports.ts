import type {
  AccountLedgerFilter,
  AccountLedgerReportDto,
  GeneralJournalFilter,
  GeneralJournalReportDto,
} from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { reportKeys } from './keys'

// S03a-DNN: Sổ nhật ký chung (phân trang theo chứng từ trên server).
export function useGeneralJournal(filter: GeneralJournalFilter) {
  return useQuery({
    queryKey: reportKeys.journal(filter),
    queryFn: () =>
      api
        .get<GeneralJournalReportDto>('/reports/general-journal', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// S03b-DNN: Sổ chi tiết các tài khoản.
export function useAccountLedger(filter: AccountLedgerFilter) {
  return useQuery({
    queryKey: reportKeys.ledger(filter),
    queryFn: () =>
      api
        .get<AccountLedgerReportDto>('/reports/account-ledger', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}
