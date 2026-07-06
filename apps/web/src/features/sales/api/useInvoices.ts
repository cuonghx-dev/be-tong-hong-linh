import type { InvoiceDto, InvoiceFilter, Paginated } from '@app/shared'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { salesKeys } from './keys'

// Danh sách hóa đơn (lọc + phân trang).
export function useInvoices(filter: InvoiceFilter) {
  return useQuery({
    queryKey: salesKeys.invoices(filter),
    queryFn: () =>
      api.get<Paginated<InvoiceDto>>('/sales/invoices', { params: filter }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Phát hành hóa đơn (cấp số + mã CQT).
export function useIssueInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post<InvoiceDto>(`/sales/invoices/${id}/issue`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: salesKeys.all }),
  })
}
