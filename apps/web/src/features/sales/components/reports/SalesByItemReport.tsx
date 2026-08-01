import type { SalesReportFilter } from '@app/shared'
import { useSalesByItemReport } from '../../api/useSalesReports'
import { money, quantity, StatusRow, tdClass, tdMoney, thClass } from './report-utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const COL_SPAN = 8

// Tổng hợp bán hàng theo mặt hàng: gộp số lượng/doanh thu theo từng mặt hàng trong kỳ.
export function SalesByItemReport({ filter }: { filter: SalesReportFilter }) {
  const { data, isLoading, isError } = useSalesByItemReport(filter)
  const rows = data?.rows ?? []

  return (
    <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow>
          <TableHead className={thClass}>Mã hàng</TableHead>
          <TableHead className={thClass}>Tên hàng</TableHead>
          <TableHead className={thClass}>ĐVT</TableHead>
          <TableHead className={thClass}>Số&nbsp;lượng</TableHead>
          <TableHead className={thClass}>Chiết&nbsp;khấu</TableHead>
          <TableHead className={thClass}>Doanh&nbsp;thu</TableHead>
          <TableHead className={thClass}>Thuế&nbsp;GTGT</TableHead>
          <TableHead className={thClass}>Tổng&nbsp;cộng</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
        {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
        {data && rows.length === 0 && (
          <StatusRow colSpan={COL_SPAN}>Không có phát sinh trong kỳ.</StatusRow>
        )}
        {rows.map((r, i) => (
          <TableRow key={`${r.itemId ?? r.itemName ?? 'none'}-${i}`}>
            <TableCell className={`${tdClass} whitespace-nowrap`}>{r.itemCode}</TableCell>
            <TableCell className={`${tdClass} max-w-[320px] truncate`} title={r.itemName ?? ''}>
              {r.itemName ?? '(Không chọn mặt hàng)'}
            </TableCell>
            <TableCell className={tdClass}>{r.unit}</TableCell>
            <TableCell className={tdMoney}>{quantity(r.quantity)}</TableCell>
            <TableCell className={tdMoney}>{money(r.discount)}</TableCell>
            <TableCell className={tdMoney}>{money(r.amount)}</TableCell>
            <TableCell className={tdMoney}>{money(r.vatAmount)}</TableCell>
            <TableCell className={tdMoney}>{money(r.total)}</TableCell>
          </TableRow>
        ))}
        {data && rows.length > 0 && (
          <TableRow className="bg-slate-50 font-semibold">
            <TableCell colSpan={4} className={tdClass}>Tổng cộng</TableCell>
            <TableCell className={tdMoney}>{money(data.totalDiscount, true)}</TableCell>
            <TableCell className={tdMoney}>{money(data.totalAmount, true)}</TableCell>
            <TableCell className={tdMoney}>{money(data.totalVat, true)}</TableCell>
            <TableCell className={tdMoney}>{money(data.totalPayment, true)}</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
