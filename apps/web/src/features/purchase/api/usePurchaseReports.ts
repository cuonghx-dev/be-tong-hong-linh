import type {
  PurchaseByItemReportDto,
  PurchaseDetailReportDto,
  PurchaseReportFilter,
  SupplierPayableDetailReportDto,
  SupplierPayableSummaryReportDto,
} from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { purchaseKeys } from './keys'

// Hook chung gọi 1 báo cáo mua hàng theo slug (/purchase/reports/<slug>).
function usePurchaseReport<T>(slug: string, filter: PurchaseReportFilter) {
  return useQuery({
    queryKey: purchaseKeys.report(slug, filter),
    queryFn: () => api.get<T>(`/purchase/reports/${slug}`, { params: filter }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Sổ chi tiết mua hàng.
export function usePurchaseDetailReport(filter: PurchaseReportFilter) {
  return usePurchaseReport<PurchaseDetailReportDto>('detail', filter)
}

// Tổng hợp mua hàng theo mặt hàng.
export function usePurchaseByItemReport(filter: PurchaseReportFilter) {
  return usePurchaseReport<PurchaseByItemReportDto>('by-item', filter)
}

// Tổng hợp công nợ phải trả nhà cung cấp (TK 331).
export function useSupplierPayableSummary(filter: PurchaseReportFilter) {
  return usePurchaseReport<SupplierPayableSummaryReportDto>('payable-summary', filter)
}

// Chi tiết công nợ phải trả nhà cung cấp (TK 331).
export function useSupplierPayableDetail(filter: PurchaseReportFilter) {
  return usePurchaseReport<SupplierPayableDetailReportDto>('payable-detail', filter)
}
