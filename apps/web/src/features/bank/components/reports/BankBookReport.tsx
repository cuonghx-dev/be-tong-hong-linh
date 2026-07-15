import type { BankBookSectionDto, BankReportFilter } from '@app/shared'
import { useNavigate } from 'react-router-dom'
import { useBankBook } from '../../api/useBankReports'
import { formatDate, money, StatusRow, tdClass, tdMoney, thClass } from './report-utils'

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
      <table className="w-full min-w-[1000px] border-collapse text-sm">
        <thead>
          <tr>
            <th className={thClass}>Ngày hạch&nbsp;toán</th>
            <th className={thClass}>Ngày chứng&nbsp;từ</th>
            <th className={thClass}>Số chứng&nbsp;từ</th>
            <th className={thClass}>Diễn&nbsp;giải</th>
            <th className={thClass}>TK đối&nbsp;ứng</th>
            <th className={thClass}>Thu (gửi&nbsp;vào)</th>
            <th className={thClass}>Chi (rút&nbsp;ra)</th>
            <th className={thClass}>Số&nbsp;dư</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-slate-50/60 font-medium">
            <td colSpan={7} className={tdClass}>Số dư đầu kỳ</td>
            <td className={tdMoney}>{money(s.openingBalance, true)}</td>
          </tr>
          {s.rows.length === 0 && (
            <StatusRow colSpan={COL_SPAN}>Không có phát sinh trong kỳ.</StatusRow>
          )}
          {s.rows.map((r, i) => (
            <tr key={`${r.voucherId}-${i}`} className="hover:bg-slate-50">
              <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.postingDate)}</td>
              <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.voucherDate)}</td>
              <td className={`${tdClass} whitespace-nowrap`}>
                <button className="text-primary hover:underline" onClick={() => openVoucher(r)}>
                  {r.voucherNo}
                </button>
              </td>
              <td className={`${tdClass} max-w-[300px] truncate`} title={r.description ?? ''}>
                {r.description}
              </td>
              <td className={tdClass}>{r.counterAccount}</td>
              <td className={tdMoney}>{money(r.receiptAmount)}</td>
              <td className={tdMoney}>{money(r.paymentAmount)}</td>
              <td className={tdMoney}>{money(r.balance, true)}</td>
            </tr>
          ))}
          <tr className="bg-slate-50 font-semibold">
            <td colSpan={5} className={tdClass}>Cộng phát sinh trong kỳ</td>
            <td className={tdMoney}>{money(s.totalReceipt, true)}</td>
            <td className={tdMoney}>{money(s.totalPayment, true)}</td>
            <td className={tdClass} />
          </tr>
          <tr className="bg-slate-50 font-semibold">
            <td colSpan={7} className={tdClass}>Số dư cuối kỳ</td>
            <td className={tdMoney}>{money(s.closingBalance, true)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

function Status({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-10 text-center text-sm text-slate-400">{children}</p>
}
