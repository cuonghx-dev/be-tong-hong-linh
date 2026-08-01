import type { CashReportFilter } from '@app/shared'
import { useDailyBalance } from '../../api/useCashReports'
import { formatDate, money } from '@/shared/lib/report-format'
import { StatusRow, tdClass, tdMoney, thClass } from '@/shared/ui/report-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const COL_SPAN = 5

// Bảng kê số dư tiền theo ngày — chỉ liệt kê ngày có phát sinh thu/chi.
export function DailyBalanceReport({ filter }: { filter: CashReportFilter }) {
  const { data, isLoading, isError } = useDailyBalance(filter)
  const rows = data?.rows ?? []

  return (
    <Table className="min-w-[720px]">
      <TableHeader>
        <TableRow>
          <TableHead className={thClass}>Ngày</TableHead>
          <TableHead className={thClass}>Tồn đầu&nbsp;ngày</TableHead>
          <TableHead className={thClass}>Thu</TableHead>
          <TableHead className={thClass}>Chi</TableHead>
          <TableHead className={thClass}>Tồn cuối&nbsp;ngày</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
        {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
        {data && (
          <TableRow className="bg-slate-50/60 font-medium">
            <TableCell colSpan={4} className={tdClass}>Số dư đầu kỳ</TableCell>
            <TableCell className={tdMoney}>{money(data.openingBalance, true)}</TableCell>
          </TableRow>
        )}
        {data && rows.length === 0 && (
          <StatusRow colSpan={COL_SPAN}>Không có phát sinh trong kỳ.</StatusRow>
        )}
        {rows.map((r) => (
          <TableRow key={r.date}>
            <TableCell className={`${tdClass} whitespace-nowrap`}>{formatDate(r.date)}</TableCell>
            <TableCell className={tdMoney}>{money(r.openingBalance, true)}</TableCell>
            <TableCell className={tdMoney}>{money(r.receiptAmount)}</TableCell>
            <TableCell className={tdMoney}>{money(r.paymentAmount)}</TableCell>
            <TableCell className={tdMoney}>{money(r.closingBalance, true)}</TableCell>
          </TableRow>
        ))}
        {data && rows.length > 0 && (
          <TableRow className="bg-slate-50 font-semibold">
            <TableCell className={tdClass}>Tổng cộng</TableCell>
            <TableCell className={tdClass} />
            <TableCell className={tdMoney}>{money(data.totalReceipt, true)}</TableCell>
            <TableCell className={tdMoney}>{money(data.totalPayment, true)}</TableCell>
            <TableCell className={tdMoney}>{money(data.closingBalance, true)}</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
