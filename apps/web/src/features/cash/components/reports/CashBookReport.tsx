import type { CashReportFilter } from '@app/shared'
import { useCashBook } from '../../api/useCashReports'
import { formatDate, money, StatusRow, tdClass, tdMoney, thClass } from './report-utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const COL_SPAN = 9

// Sổ kế toán chi tiết quỹ tiền mặt: dòng số dư đầu kỳ + từng dòng hạch toán
// (thu/chi + tồn lũy kế do BE tính) + cộng phát sinh + số dư cuối kỳ.
export function CashBookReport({ filter }: { filter: CashReportFilter }) {
  const { data, isLoading, isError } = useCashBook(filter)
  const rows = data?.rows ?? []

  return (
    <Table className="min-w-[1000px]">
      <TableHeader>
        <TableRow>
          <TableHead className={thClass}>Ngày hạch&nbsp;toán</TableHead>
          <TableHead className={thClass}>Ngày chứng&nbsp;từ</TableHead>
          <TableHead className={thClass}>Số phiếu&nbsp;thu</TableHead>
          <TableHead className={thClass}>Số phiếu&nbsp;chi</TableHead>
          <TableHead className={thClass}>Diễn&nbsp;giải</TableHead>
          <TableHead className={thClass}>TK đối&nbsp;ứng</TableHead>
          <TableHead className={thClass}>Thu</TableHead>
          <TableHead className={thClass}>Chi</TableHead>
          <TableHead className={thClass}>Tồn</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
        {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
        {data && (
          <TableRow className="bg-slate-50/60 font-medium">
            <TableCell colSpan={8} className={tdClass}>Số dư đầu kỳ</TableCell>
            <TableCell className={tdMoney}>{money(data.openingBalance, true)}</TableCell>
          </TableRow>
        )}
        {data && rows.length === 0 && (
          <StatusRow colSpan={COL_SPAN}>Không có phát sinh trong kỳ.</StatusRow>
        )}
        {rows.map((r, i) => (
          <TableRow key={`${r.voucherId}-${i}`}>
            <TableCell className={`${tdClass} whitespace-nowrap`}>{formatDate(r.postingDate)}</TableCell>
            <TableCell className={`${tdClass} whitespace-nowrap`}>{formatDate(r.voucherDate)}</TableCell>
            <TableCell className={`${tdClass} whitespace-nowrap`}>{r.receiptNo}</TableCell>
            <TableCell className={`${tdClass} whitespace-nowrap`}>{r.paymentNo}</TableCell>
            <TableCell className={`${tdClass} max-w-[300px] truncate`} title={r.description ?? ''}>
              {r.description}
            </TableCell>
            <TableCell className={tdClass}>{r.counterAccount}</TableCell>
            <TableCell className={tdMoney}>{money(r.receiptAmount)}</TableCell>
            <TableCell className={tdMoney}>{money(r.paymentAmount)}</TableCell>
            <TableCell className={tdMoney}>{money(r.balance, true)}</TableCell>
          </TableRow>
        ))}
        {data && (
          <>
            <TableRow className="bg-slate-50 font-semibold">
              <TableCell colSpan={6} className={tdClass}>Cộng phát sinh trong kỳ</TableCell>
              <TableCell className={tdMoney}>{money(data.totalReceipt, true)}</TableCell>
              <TableCell className={tdMoney}>{money(data.totalPayment, true)}</TableCell>
              <TableCell className={tdClass} />
            </TableRow>
            <TableRow className="bg-slate-50 font-semibold">
              <TableCell colSpan={8} className={tdClass}>Số dư cuối kỳ</TableCell>
              <TableCell className={tdMoney}>{money(data.closingBalance, true)}</TableCell>
            </TableRow>
          </>
        )}
      </TableBody>
    </Table>
  )
}
