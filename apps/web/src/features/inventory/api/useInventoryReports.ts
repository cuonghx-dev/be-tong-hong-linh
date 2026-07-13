import type {
  ItemLedgerFilter,
  ItemLedgerReportDto,
  StockSummaryFilter,
  StockSummaryReportDto,
} from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { inventoryKeys } from './keys'

// Tổng hợp tồn kho (mỗi VTHH 1 dòng: đầu kỳ / nhập / xuất / cuối kỳ).
export function useStockSummary(filter: StockSummaryFilter) {
  return useQuery({
    queryKey: inventoryKeys.report('stock-summary', filter),
    queryFn: () =>
      api
        .get<StockSummaryReportDto>('/inventory/reports/stock-summary', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Sổ chi tiết vật tư hàng hóa — chỉ gọi khi đã chọn VTHH.
export function useItemLedger(filter: ItemLedgerFilter) {
  return useQuery({
    queryKey: inventoryKeys.report('item-ledger', filter),
    queryFn: () =>
      api
        .get<ItemLedgerReportDto>('/inventory/reports/item-ledger', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
    enabled: !!filter.itemCode,
  })
}
