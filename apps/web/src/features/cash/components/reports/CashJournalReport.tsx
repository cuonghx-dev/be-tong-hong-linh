import type { CashJournalRowDto, CashReportFilter } from '@app/shared'
import { useMemo } from 'react'
import { useCashJournal } from '../../api/useCashReports'
import { formatDate, money, StatusRow, tdClass, tdMoney, thClass } from './report-utils'

// Số cột TK đối ứng tách riêng; các TK còn lại gộp vào cột "TK khác".
const MAX_PIVOT_COLUMNS = 5

// Sổ nhật ký thu tiền (S03a1-DNN) / chi tiền (S03a2-DNN) — mẫu TT133: mỗi dòng
// hạch toán 1 dòng sổ, cột "Ghi Có/Nợ các TK đối ứng" dựng động (pivot) theo
// các TK phát sinh lớn nhất trong kỳ.
export function CashJournalReport({
  kind,
  filter,
}: {
  kind: 'receipt' | 'payment'
  filter: CashReportFilter
}) {
  const isReceipt = kind === 'receipt'
  const { data, isLoading, isError } = useCashJournal(kind, filter)

  const rows = data?.rows ?? []
  const pivot = useMemo(() => buildPivot(rows), [rows])
  const colSpan = 5 + pivot.accounts.length + (pivot.hasOther ? 1 : 0)

  return (
    <table className="w-full min-w-[900px] border-collapse text-sm">
      <thead className="sticky top-0 z-10">
        <tr>
          <th rowSpan={2} className={thClass}>Ngày hạch toán</th>
          <th rowSpan={2} className={thClass}>Ngày chứng từ</th>
          <th rowSpan={2} className={thClass}>Số chứng từ</th>
          <th rowSpan={2} className={thClass}>Diễn giải</th>
          <th rowSpan={2} className={thClass}>
            {isReceipt ? 'Ghi Nợ TK 111' : 'Ghi Có TK 111'}
          </th>
          <th colSpan={pivot.accounts.length + (pivot.hasOther ? 1 : 0)} className={thClass}>
            {isReceipt ? 'Ghi Có các tài khoản' : 'Ghi Nợ các tài khoản'}
          </th>
        </tr>
        <tr>
          {pivot.accounts.map((acc) => (
            <th key={acc} className={thClass}>TK {acc}</th>
          ))}
          {pivot.hasOther && <th className={thClass}>TK khác</th>}
        </tr>
      </thead>
      <tbody>
        {isLoading && <StatusRow colSpan={colSpan}>Đang tải…</StatusRow>}
        {isError && <StatusRow colSpan={colSpan}>Lỗi tải dữ liệu.</StatusRow>}
        {!isLoading && !isError && rows.length === 0 && (
          <StatusRow colSpan={colSpan}>Không có phát sinh trong kỳ.</StatusRow>
        )}
        {rows.map((r, i) => (
          <tr key={`${r.voucherId}-${i}`} className="hover:bg-slate-50">
            <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.postingDate)}</td>
            <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.voucherDate)}</td>
            <td className={`${tdClass} whitespace-nowrap`}>{r.voucherNo}</td>
            <td className={`${tdClass} max-w-[320px] truncate`} title={r.description ?? ''}>
              {r.description}
            </td>
            <td className={tdMoney}>{money(r.amount, true)}</td>
            {pivot.accounts.map((acc) => (
              <td key={acc} className={tdMoney}>
                {r.counterAccount === acc ? money(r.amount, true) : ''}
              </td>
            ))}
            {pivot.hasOther && (
              <td className={tdMoney}>
                {pivot.accounts.includes(r.counterAccount) ? '' : (
                  <>
                    {money(r.amount, true)}
                    {r.counterAccount && (
                      <span className="text-xs text-slate-400"> ({r.counterAccount})</span>
                    )}
                  </>
                )}
              </td>
            )}
          </tr>
        ))}
        {rows.length > 0 && (
          <tr className="bg-slate-50 font-semibold">
            <td colSpan={4} className={tdClass}>Tổng cộng</td>
            <td className={tdMoney}>{money(data?.totalAmount ?? '0', true)}</td>
            {pivot.accounts.map((acc) => (
              <td key={acc} className={tdMoney}>{money(String(pivot.totals.get(acc) ?? 0), true)}</td>
            ))}
            {pivot.hasOther && <td className={tdMoney}>{money(String(pivot.otherTotal), true)}</td>}
          </tr>
        )}
      </tbody>
    </table>
  )
}

// Chọn tối đa MAX_PIVOT_COLUMNS TK đối ứng có tổng phát sinh lớn nhất làm cột
// riêng (hiển thị theo thứ tự mã TK); phần còn lại gộp cột "TK khác".
// TK đối ứng rỗng (dữ liệu nhập khẩu thiếu định khoản) luôn vào "TK khác".
function buildPivot(rows: CashJournalRowDto[]) {
  const totals = new Map<string, number>()
  for (const r of rows) {
    totals.set(r.counterAccount, (totals.get(r.counterAccount) ?? 0) + Number(r.amount))
  }
  const accounts = [...totals.entries()]
    .filter(([acc]) => acc !== '')
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_PIVOT_COLUMNS)
    .map(([acc]) => acc)
    .sort()
  const otherTotal = [...totals.entries()]
    .filter(([acc]) => !accounts.includes(acc))
    .reduce((sum, [, amount]) => sum + amount, 0)
  return { totals, accounts, hasOther: totals.size > accounts.length, otherTotal }
}
