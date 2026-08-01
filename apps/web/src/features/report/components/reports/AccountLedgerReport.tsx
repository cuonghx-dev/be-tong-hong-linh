import type { AccountLedgerFilter, AccountLedgerSectionDto } from '@app/shared'
import { useAccountLedger } from '../../api/useGeneralReports'
import { formatDate, money, periodLabel } from '@/shared/lib/report-format'
import { StatusRow, tdClass, tdMoney, thClass } from '@/shared/ui/report-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

// S03b-DNN: Sổ chi tiết các tài khoản — mỗi TK 1 section: dư đầu kỳ, dòng phát
// sinh kèm TK đối ứng + dư lũy kế, cộng phát sinh và dư cuối kỳ.
export function AccountLedgerReport({ filter }: { filter: AccountLedgerFilter }) {
  const { data, isLoading, isError } = useAccountLedger(filter)
  const sections = data?.sections ?? []

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">
        {/* Tiêu đề sổ + kỳ báo cáo (giữa trang, như mẫu in) */}
        <div className="py-4 text-center">
          <div className="text-lg font-bold uppercase text-slate-800">
            Sổ chi tiết các tài khoản
          </div>
          <div className="text-sm italic text-slate-500">{periodLabel(filter)}</div>
        </div>

        <Table className="min-w-[1080px]">
          <TableHeader>
            <TableRow>
              <TableHead rowSpan={2} className={thClass}>Ngày, tháng ghi&nbsp;sổ</TableHead>
              <TableHead colSpan={2} className={`${thClass} text-center`}>Chứng&nbsp;từ</TableHead>
              <TableHead rowSpan={2} className={thClass}>Diễn&nbsp;giải</TableHead>
              <TableHead rowSpan={2} className={thClass}>TK đối&nbsp;ứng</TableHead>
              <TableHead colSpan={2} className={`${thClass} text-center`}>Số phát&nbsp;sinh</TableHead>
              <TableHead colSpan={2} className={`${thClass} text-center`}>Số&nbsp;dư</TableHead>
            </TableRow>
            <TableRow>
              <TableHead className={thClass}>Số&nbsp;hiệu</TableHead>
              <TableHead className={thClass}>Ngày&nbsp;tháng</TableHead>
              <TableHead className={`${thClass} text-right`}>Nợ</TableHead>
              <TableHead className={`${thClass} text-right`}>Có</TableHead>
              <TableHead className={`${thClass} text-right`}>Nợ</TableHead>
              <TableHead className={`${thClass} text-right`}>Có</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <StatusRow colSpan={9}>Đang tải…</StatusRow>}
            {isError && <StatusRow colSpan={9}>Lỗi tải dữ liệu.</StatusRow>}
            {!isLoading && !isError && sections.length === 0 && (
              <StatusRow colSpan={9}>Không có số dư/phát sinh trong kỳ.</StatusRow>
            )}
            {sections.map((s) => (
              <LedgerSection key={s.accountCode} section={s} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function LedgerSection({ section: s }: { section: AccountLedgerSectionDto }) {
  return (
    <>
      {/* Header TK */}
      <TableRow className="bg-slate-100 font-semibold">
        <TableCell colSpan={9} className={tdClass}>
          Tài khoản {s.accountCode}
          {s.accountName ? ` — ${s.accountName}` : ''}
        </TableCell>
      </TableRow>
      {/* Số dư đầu kỳ */}
      <TableRow className="font-medium">
        <TableCell colSpan={5} className={tdClass}>Số dư đầu kỳ</TableCell>
        <TableCell className={tdMoney} />
        <TableCell className={tdMoney} />
        <TableCell className={tdMoney}>{money(s.openingDebit)}</TableCell>
        <TableCell className={tdMoney}>{money(s.openingCredit)}</TableCell>
      </TableRow>
      {s.rows.map((r, i) => (
        <TableRow key={`${s.accountCode}-${i}`}>
          <TableCell className={`${tdClass} whitespace-nowrap`}>{formatDate(r.postingDate)}</TableCell>
          <TableCell className={`${tdClass} whitespace-nowrap`} title={r.voucherKind}>
            {r.voucherNo}
          </TableCell>
          <TableCell className={`${tdClass} whitespace-nowrap`}>{formatDate(r.voucherDate)}</TableCell>
          <TableCell className={`${tdClass} max-w-[320px] truncate`} title={r.description ?? ''}>
            {r.description}
          </TableCell>
          <TableCell className={`${tdClass} whitespace-nowrap`}>{r.counterAccount}</TableCell>
          <TableCell className={tdMoney}>{money(r.debitAmount)}</TableCell>
          <TableCell className={tdMoney}>{money(r.creditAmount)}</TableCell>
          <TableCell className={tdMoney}>{money(r.balanceDebit)}</TableCell>
          <TableCell className={tdMoney}>{money(r.balanceCredit)}</TableCell>
        </TableRow>
      ))}
      {/* Cộng phát sinh + dư cuối kỳ */}
      <TableRow className="bg-slate-50 font-semibold">
        <TableCell colSpan={5} className={tdClass}>Cộng phát sinh trong kỳ</TableCell>
        <TableCell className={tdMoney}>{money(s.totalDebit, true)}</TableCell>
        <TableCell className={tdMoney}>{money(s.totalCredit, true)}</TableCell>
        <TableCell className={tdMoney} />
        <TableCell className={tdMoney} />
      </TableRow>
      <TableRow className="bg-slate-50 font-semibold">
        <TableCell colSpan={5} className={tdClass}>Số dư cuối kỳ</TableCell>
        <TableCell className={tdMoney} />
        <TableCell className={tdMoney} />
        <TableCell className={tdMoney}>{money(s.closingDebit)}</TableCell>
        <TableCell className={tdMoney}>{money(s.closingCredit)}</TableCell>
      </TableRow>
    </>
  )
}
