import type { CreateInvoiceInput, InvoiceDto, InvoiceFilter, Paginated } from '@app/shared'
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

// Chi tiết 1 hóa đơn.
export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: salesKeys.invoice(id ?? ''),
    queryFn: () => api.get<InvoiceDto>(`/sales/invoices/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

// Tạo hóa đơn nhập tay.
export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateInvoiceInput) =>
      api.post<InvoiceDto>('/sales/invoices', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: salesKeys.all }),
  })
}

export interface ImportResult {
  total: number
  created: number
  skipped: number
}

// Nhập khẩu hóa đơn từ Excel.
export function useImportInvoices() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>('/sales/invoices/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: salesKeys.all }),
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
