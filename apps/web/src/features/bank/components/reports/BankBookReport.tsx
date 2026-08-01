import type { BankBookSectionDto, BankReportFilter } from '@app/shared'
import { useNavigate } from 'react-router-dom'
import { useBankBook } from '../../api/useBankReports'
import { formatDate, money } from '@/shared/lib/report-format'
import { StatusRow, tdClass, tdMoney, thClass } from '@/shared/ui/report-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const COL_SPAN = 8

// Sổ tiền gửi ngân hàng: 1 section / TK ngân hàng — dòng số dư đầu kỳ + từng
// dòng hạch toán (thu/chi + số dư lũy kế do BE tính) + cộng phát sinh + dư cuối kỳ.
export function BankBookReport({ filter }: { filter: BankReportFilter }) {
  const { data, isLoading, isError } = useBankBook(filter)
  const sections = data?.sections ?? []

  if (isLoading) return <Status>Đang tải…</Status>
  if (isError) return <Status>Lỗi tải dữ liệu.</Status>
  if (sections.length === 0) return <Status>Không có số dư/phát sinh tiền gửi trong kỳ.</Status>

  return (
    <div className="flex flex-col gap-4 p-3">
      {sections.map((s) => (
        <BankBookSection key={s.bankAccountNo || '(trống)'} section={s} />
      ))}
    </div>
  )
}

function BankBookSection({ section: s }: { section: BankBookSectionDto }) {
  const navigate = useNavigate()
  // Drill-down: mở trang xem chứng từ gốc (tiền gửi hoặc phiếu thu/chi tiền mặt).
  const openVoucher = (row: BankBookSectionDto['rows'][number]) => {
    const base = row.voucherSource === 'BANK' ? '/bank/vouchers' : '/cash/vouchers'
    navigate(`${base}/${row.voucherId}?type=${row.voucherType}`)
  }

  return (
    <section>
      <div className="flex flex-wrap items-baseline gap-2 pb-1.5">
        <span className="text-sm font-bold text-slate-700">
          {s.bankAccountNo || 'Chưa chọn TK ngân hàng'}
        </span>
        {s.bankName && <span className="text-sm text-slate-500">{s.bankName}</span>}
      </div>
      <Table className="min-w-[1000px]">
        <TableHeader>
          <TableRow>
            <TableHead className={thClass}>Ngày hạch&nbsp;toán</TableHead>
            <TableHead className={thClass}>Ngày chứng&nbsp;từ</TableHead>
            <TableHead className={thClass}>Số chứng&nbsp;từ</TableHead>
            <TableHead className={thClass}>Diễn&nbsp;giải</TableHead>
            <TableHead className={thClass}>TK đối&nbsp;ứng</TableHead>
            <TableHead className={thClass}>Thu (gửi&nbsp;vào)</TableHead>
            <TableHead className={thClass}>Chi (rút&nbsp;ra)</TableHead>
            <TableHead className={thClass}>Số&nbsp;dư</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="bg-slate-50/60 font-medium">
            <TableCell colSpan={7} className={tdClass}>Số dư đầu kỳ</TableCell>
            <TableCell className={tdMoney}>{money(s.openingBalance, true)}</TableCell>
          </TableRow>
          {s.rows.length === 0 && (
            <StatusRow colSpan={COL_SPAN}>Không có phát sinh trong kỳ.</StatusRow>
          )}
          {s.rows.map((r, i) => (
            <TableRow key={`${r.voucherId}-${i}`}>
              <TableCell className={`${tdClass} whitespace-nowrap`}>{formatDate(r.postingDate)}</TableCell>
              <TableCell className={`${tdClass} whitespace-nowrap`}>{formatDate(r.voucherDate)}</TableCell>
              <TableCell className={`${tdClass} whitespace-nowrap`}>
                <button className="text-primary hover:underline" onClick={() => openVoucher(r)}>
                  {r.voucherNo}
                </button>
              </TableCell>
              <TableCell className={`${tdClass} max-w-[300px] truncate`} title={r.description ?? ''}>
                {r.description}
              </TableCell>
              <TableCell className={tdClass}>{r.counterAccount}</TableCell>
              <TableCell className={tdMoney}>{money(r.receiptAmount)}</TableCell>
              <TableCell className={tdMoney}>{money(r.paymentAmount)}</TableCell>
              <TableCell className={tdMoney}>{money(r.balance, true)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-slate-50 font-semibold">
            <TableCell colSpan={5} className={tdClass}>Cộng phát sinh trong kỳ</TableCell>
            <TableCell className={tdMoney}>{money(s.totalReceipt, true)}</TableCell>
            <TableCell className={tdMoney}>{money(s.totalPayment, true)}</TableCell>
            <TableCell className={tdClass} />
          </TableRow>
          <TableRow className="bg-slate-50 font-semibold">
            <TableCell colSpan={7} className={tdClass}>Số dư cuối kỳ</TableCell>
            <TableCell className={tdMoney}>{money(s.closingBalance, true)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </section>
  )
}

function Status({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-10 text-center text-sm text-slate-400">{children}</p>
}
