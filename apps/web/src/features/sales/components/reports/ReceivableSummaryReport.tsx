import type { SalesReportFilter } from '@app/shared'
import { useCustomerReceivableSummary } from '../../api/useSalesReports'
import { money, StatusRow, tdClass, tdMoney, thClass } from './report-utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const COL_SPAN = 6

// Tổng hợp công nợ phải thu KH (TK 131): mỗi KH 1 dòng
// dư Nợ đầu kỳ / phát sinh Nợ / phát sinh Có / dư Nợ cuối kỳ.
export function ReceivableSummaryReport({ filter }: { filter: SalesReportFilter }) {
  const { data, isLoading, isError } = useCustomerReceivableSummary(filter)
  const rows = data?.rows ?? []

  return (
    <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow>
          <TableHead className={thClass}>Mã khách&nbsp;hàng</TableHead>
          <TableHead className={thClass}>Tên khách&nbsp;hàng</TableHead>
          <TableHead className={thClass}>Dư&nbsp;Nợ đầu&nbsp;kỳ</TableHead>
          <TableHead className={thClass}>Phát&nbsp;sinh Nợ</TableHead>
          <TableHead className={thClass}>Phát&nbsp;sinh Có</TableHead>
          <TableHead className={thClass}>Dư&nbsp;Nợ cuối&nbsp;kỳ</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
        {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
        {data && rows.length === 0 && (
          <StatusRow colSpan={COL_SPAN}>Không có công nợ trong kỳ.</StatusRow>
        )}
        {rows.map((r, i) => (
          <TableRow key={`${r.customerId ?? r.customerName}-${i}`}>
            <TableCell className={`${tdClass} whitespace-nowrap`}>{r.customerCode}</TableCell>
            <TableCell className={`${tdClass} max-w-[320px] truncate`} title={r.customerName}>
              {r.customerName}
            </TableCell>
            <TableCell className={tdMoney}>{money(r.openingBalance)}</TableCell>
            <TableCell className={tdMoney}>{money(r.debitAmount)}</TableCell>
            <TableCell className={tdMoney}>{money(r.creditAmount)}</TableCell>
            <TableCell className={tdMoney}>{money(r.closingBalance)}</TableCell>
          </TableRow>
        ))}
        {data && rows.length > 0 && (
          <TableRow className="bg-slate-50 font-semibold">
            <TableCell colSpan={2} className={tdClass}>Tổng cộng</TableCell>
            <TableCell className={tdMoney}>{money(data.totalOpening, true)}</TableCell>
            <TableCell className={tdMoney}>{money(data.totalDebit, true)}</TableCell>
            <TableCell className={tdMoney}>{money(data.totalCredit, true)}</TableCell>
            <TableCell className={tdMoney}>{money(data.totalClosing, true)}</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
