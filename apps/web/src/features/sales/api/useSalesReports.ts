import type {
  CustomerReceivableDetailReportDto,
  CustomerReceivableSummaryReportDto,
  SalesByItemReportDto,
  SalesDetailReportDto,
  SalesReportFilter,
} from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { salesKeys } from './keys'

// Hook chung gọi 1 báo cáo bán hàng theo slug (/sales/reports/<slug>).
function useSalesReport<T>(slug: string, filter: SalesReportFilter) {
  return useQuery({
    queryKey: salesKeys.report(slug, filter),
    queryFn: () => api.get<T>(`/sales/reports/${slug}`, { params: filter }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Sổ chi tiết bán hàng.
export function useSalesDetailReport(filter: SalesReportFilter) {
  return useSalesReport<SalesDetailReportDto>('detail', filter)
}

// Tổng hợp bán hàng theo mặt hàng.
export function useSalesByItemReport(filter: SalesReportFilter) {
  return useSalesReport<SalesByItemReportDto>('by-item', filter)
}

// Tổng hợp công nợ phải thu khách hàng (TK 131).
export function useCustomerReceivableSummary(filter: SalesReportFilter) {
  return useSalesReport<CustomerReceivableSummaryReportDto>('receivable-summary', filter)
}

// Chi tiết công nợ phải thu khách hàng (TK 131).
export function useCustomerReceivableDetail(filter: SalesReportFilter) {
  return useSalesReport<CustomerReceivableDetailReportDto>('receivable-detail', filter)
}
