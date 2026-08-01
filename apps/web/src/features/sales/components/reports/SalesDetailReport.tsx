import type { SalesReportFilter } from '@app/shared'
import { useSalesDetailReport } from '../../api/useSalesReports'
import { formatDate, money, quantity } from '@/shared/lib/report-format'
import { StatusRow, tdClass, tdMoney, thClass } from '@/shared/ui/report-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const COL_SPAN = 12

// Sổ chi tiết bán hàng: từng dòng hàng của chứng từ bán trong kỳ + dòng tổng cộng.
export function SalesDetailReport({ filter }: { filter: SalesReportFilter }) {
  const { data, isLoading, isError } = useSalesDetailReport(filter)
  const rows = data?.rows ?? []

  return (
    <Table className="min-w-[1200px]">
      <TableHeader>
        <TableRow>
          <TableHead className={thClass}>Ngày hạch&nbsp;toán</TableHead>
          <TableHead className={thClass}>Ngày chứng&nbsp;từ</TableHead>
          <TableHead className={thClass}>Số chứng&nbsp;từ</TableHead>
          <TableHead className={thClass}>Khách&nbsp;hàng</TableHead>
          <TableHead className={thClass}>Mặt&nbsp;hàng</TableHead>
          <TableHead className={thClass}>ĐVT</TableHead>
          <TableHead className={thClass}>Số&nbsp;lượng</TableHead>
          <TableHead className={thClass}>Đơn&nbsp;giá</TableHead>
          <TableHead className={thClass}>Chiết&nbsp;khấu</TableHead>
          <TableHead className={thClass}>Doanh&nbsp;thu</TableHead>
          <TableHead className={thClass}>Thuế&nbsp;GTGT</TableHead>
          <TableHead className={thClass}>Tổng thanh&nbsp;toán</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
        {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
        {data && rows.length === 0 && (
          <StatusRow colSpan={COL_SPAN}>Không có phát sinh trong kỳ.</StatusRow>
        )}
        {rows.map((r, i) => (
          <TableRow key={`${r.voucherId}-${i}`}>
            <TableCell className={`${tdClass} whitespace-nowrap`}>{formatDate(r.postingDate)}</TableCell>
            <TableCell className={`${tdClass} whitespace-nowrap`}>{formatDate(r.voucherDate)}</TableCell>
            <TableCell className={`${tdClass} whitespace-nowrap`}>{r.voucherNo}</TableCell>
            <TableCell className={`${tdClass} max-w-[220px] truncate`} title={r.customerName ?? ''}>
              {r.customerName}
            </TableCell>
            <TableCell className={`${tdClass} max-w-[220px] truncate`} title={r.itemName ?? ''}>
              {r.itemName}
            </TableCell>
            <TableCell className={tdClass}>{r.unit}</TableCell>
            <TableCell className={tdMoney}>{quantity(r.quantity)}</TableCell>
            <TableCell className={tdMoney}>{money(r.unitPrice)}</TableCell>
            <TableCell className={tdMoney}>{money(r.discount)}</TableCell>
            <TableCell className={tdMoney}>{money(r.amount)}</TableCell>
            <TableCell className={tdMoney}>{money(r.vatAmount)}</TableCell>
            <TableCell className={tdMoney}>{money(r.totalPayment)}</TableCell>
          </TableRow>
        ))}
        {data && rows.length > 0 && (
          <TableRow className="bg-slate-50 font-semibold">
            <TableCell colSpan={8} className={tdClass}>Tổng cộng</TableCell>
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
