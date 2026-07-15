import type { AccountLedgerFilter, AccountLedgerSectionDto } from '@app/shared'
import { useAccountLedger } from '../../api/useGeneralReports'
import { formatDate, money, periodLabel, StatusRow, tdClass, tdMoney, thClass } from './report-utils'

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

        <table className="w-full min-w-[1080px] border-collapse text-sm">
          <thead className="sticky top-0 z-20">
            <tr>
              <th rowSpan={2} className={thClass}>Ngày, tháng ghi&nbsp;sổ</th>
              <th colSpan={2} className={`${thClass} text-center`}>Chứng&nbsp;từ</th>
              <th rowSpan={2} className={thClass}>Diễn&nbsp;giải</th>
              <th rowSpan={2} className={thClass}>TK đối&nbsp;ứng</th>
              <th colSpan={2} className={`${thClass} text-center`}>Số phát&nbsp;sinh</th>
              <th colSpan={2} className={`${thClass} text-center`}>Số&nbsp;dư</th>
            </tr>
            <tr>
              <th className={thClass}>Số&nbsp;hiệu</th>
              <th className={thClass}>Ngày&nbsp;tháng</th>
              <th className={`${thClass} text-right`}>Nợ</th>
              <th className={`${thClass} text-right`}>Có</th>
              <th className={`${thClass} text-right`}>Nợ</th>
              <th className={`${thClass} text-right`}>Có</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <StatusRow colSpan={9}>Đang tải…</StatusRow>}
            {isError && <StatusRow colSpan={9}>Lỗi tải dữ liệu.</StatusRow>}
            {!isLoading && !isError && sections.length === 0 && (
              <StatusRow colSpan={9}>Không có số dư/phát sinh trong kỳ.</StatusRow>
            )}
            {sections.map((s) => (
              <LedgerSection key={s.accountCode} section={s} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LedgerSection({ section: s }: { section: AccountLedgerSectionDto }) {
  return (
    <>
      {/* Header TK */}
      <tr className="bg-slate-100 font-semibold">
        <td colSpan={9} className={tdClass}>
          Tài khoản {s.accountCode}
          {s.accountName ? ` — ${s.accountName}` : ''}
        </td>
      </tr>
      {/* Số dư đầu kỳ */}
      <tr className="font-medium">
        <td colSpan={5} className={tdClass}>Số dư đầu kỳ</td>
        <td className={tdMoney} />
        <td className={tdMoney} />
        <td className={tdMoney}>{money(s.openingDebit)}</td>
        <td className={tdMoney}>{money(s.openingCredit)}</td>
      </tr>
      {s.rows.map((r, i) => (
        <tr key={`${s.accountCode}-${i}`} className="hover:bg-slate-50">
          <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.postingDate)}</td>
          <td className={`${tdClass} whitespace-nowrap`} title={r.voucherKind}>
            {r.voucherNo}
          </td>
          <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.voucherDate)}</td>
          <td className={`${tdClass} max-w-[320px] truncate`} title={r.description ?? ''}>
            {r.description}
          </td>
          <td className={`${tdClass} whitespace-nowrap`}>{r.counterAccount}</td>
          <td className={tdMoney}>{money(r.debitAmount)}</td>
          <td className={tdMoney}>{money(r.creditAmount)}</td>
          <td className={tdMoney}>{money(r.balanceDebit)}</td>
          <td className={tdMoney}>{money(r.balanceCredit)}</td>
        </tr>
      ))}
      {/* Cộng phát sinh + dư cuối kỳ */}
      <tr className="bg-slate-50 font-semibold">
        <td colSpan={5} className={tdClass}>Cộng phát sinh trong kỳ</td>
        <td className={tdMoney}>{money(s.totalDebit, true)}</td>
        <td className={tdMoney}>{money(s.totalCredit, true)}</td>
        <td className={tdMoney} />
        <td className={tdMoney} />
      </tr>
      <tr className="bg-slate-50 font-semibold">
        <td colSpan={5} className={tdClass}>Số dư cuối kỳ</td>
        <td className={tdMoney} />
        <td className={tdMoney} />
        <td className={tdMoney}>{money(s.closingDebit)}</td>
        <td className={tdMoney}>{money(s.closingCredit)}</td>
      </tr>
    </>
  )
}
