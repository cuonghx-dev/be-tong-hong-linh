import type { CashJournalRowDto, CashReportFilter } from '@app/shared'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCashJournal } from '../../api/useCashReports'
import { formatDate, money, StatusRow, tdClass, tdMoney, thClass } from './report-utils'

// Số cột TK đối ứng tách riêng (như MISA); các TK còn lại gộp nhóm "TK khác".
const MAX_PIVOT_COLUMNS = 4
const PAGE_SIZE = 20

// 1 chứng từ = 1 dòng sổ: tổng ghi Nợ/Có TK 111 + số tiền chia theo TK đối ứng.
interface VoucherRow {
  voucherId: string
  postingDate: string
  voucherNo: string
  voucherDate: string
  description: string | null
  total: number
  byAccount: Map<string, number>
  otherAmount: number
  otherCodes: string[] // Số hiệu các TK ngoài cột pivot (rỗng nếu thiếu định khoản)
}

// Sổ nhật ký thu tiền (S03a1-DNN) / chi tiền (S03a2-DNN) — layout theo MISA:
// mỗi chứng từ 1 dòng, cột "Ghi Có/Nợ các TK" dựng động (pivot) theo các TK
// phát sinh lớn nhất trong kỳ, phần còn lại vào nhóm "TK khác" (Số tiền + Số hiệu).
export function CashJournalReport({
  kind,
  filter,
}: {
  kind: 'receipt' | 'payment'
  filter: CashReportFilter
}) {
  const isReceipt = kind === 'receipt'
  const { data, isLoading, isError } = useCashJournal(kind, filter)
  const [params, setParams] = useSearchParams()

  const lines = data?.rows ?? []
  const { vouchers, accounts, accountTotals, otherTotal } = useMemo(
    () => buildPivot(lines),
    [lines],
  )

  const page = Math.max(1, Number(params.get('page') ?? 1))
  const pageCount = Math.max(1, Math.ceil(vouchers.length / PAGE_SIZE))
  const pageRows = vouchers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const setPage = (p: number) => {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    setParams(next, { replace: true })
  }

  const colSpan = 5 + accounts.length
  const side = isReceipt ? 'Có' : 'Nợ'

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">
        {/* Tiêu đề sổ + kỳ báo cáo (giữa trang, như mẫu in) */}
        <div className="py-4 text-center">
          <div className="text-lg font-bold uppercase text-slate-800">
            Sổ nhật ký {isReceipt ? 'thu' : 'chi'} tiền
          </div>
          <div className="text-sm italic text-slate-500">{periodLabel(filter)}</div>
        </div>

        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th rowSpan={2} className={thClass}>Ngày, tháng ghi sổ</th>
              <th colSpan={2} className={`${thClass} text-center`}>Chứng từ</th>
              <th rowSpan={2} className={thClass}>Diễn giải</th>
              <th rowSpan={2} className={thClass}>Ghi {isReceipt ? 'nợ' : 'có'} TK 111</th>
              <th colSpan={Math.max(accounts.length, 1)} className={`${thClass} text-center`}>
                Ghi {side.toLowerCase()} các TK
              </th>
              <th colSpan={2} className={`${thClass} text-center`}>
                Ghi {side.toLowerCase()} các TK khác
              </th>
            </tr>
            <tr>
              <th className={thClass}>Số hiệu</th>
              <th className={thClass}>Ngày tháng</th>
              {accounts.map((acc) => (
                <th key={acc} className={`${thClass} text-right`}>{acc}</th>
              ))}
              {accounts.length === 0 && <th className={thClass} />}
              <th className={`${thClass} text-right`}>Số tiền</th>
              <th className={`${thClass} text-right`}>Số hiệu</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <StatusRow colSpan={colSpan + 2}>Đang tải…</StatusRow>}
            {isError && <StatusRow colSpan={colSpan + 2}>Lỗi tải dữ liệu.</StatusRow>}
            {!isLoading && !isError && vouchers.length === 0 && (
              <StatusRow colSpan={colSpan + 2}>Không có phát sinh trong kỳ.</StatusRow>
            )}
            {pageRows.map((v) => (
              <tr key={v.voucherId} className="hover:bg-slate-50">
                <td className={`${tdClass} whitespace-nowrap`}>{formatDate(v.postingDate)}</td>
                <td className={`${tdClass} whitespace-nowrap`}>{v.voucherNo}</td>
                <td className={`${tdClass} whitespace-nowrap`}>{formatDate(v.voucherDate)}</td>
                <td className={`${tdClass} max-w-[360px] truncate`} title={v.description ?? ''}>
                  {v.description}
                </td>
                <td className={tdMoney}>{money(String(v.total), true)}</td>
                {accounts.map((acc) => (
                  <td key={acc} className={tdMoney}>
                    {money(String(v.byAccount.get(acc) ?? 0))}
                  </td>
                ))}
                {accounts.length === 0 && <td className={tdClass} />}
                <td className={tdMoney}>{money(String(v.otherAmount))}</td>
                <td className={`${tdClass} whitespace-nowrap text-right text-slate-500`}>
                  {v.otherCodes.join(', ')}
                </td>
              </tr>
            ))}
            {vouchers.length > 0 && (
              <tr className="bg-slate-50 font-semibold">
                <td colSpan={4} className={tdClass}>Tổng cộng</td>
                <td className={tdMoney}>{money(data?.totalAmount ?? '0', true)}</td>
                {accounts.map((acc) => (
                  <td key={acc} className={tdMoney}>
                    {money(String(accountTotals.get(acc) ?? 0), true)}
                  </td>
                ))}
                {accounts.length === 0 && <td className={tdClass} />}
                <td className={tdMoney}>{money(String(otherTotal), true)}</td>
                <td className={tdClass} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer phân trang — theo pattern bảng danh sách (§3) */}
      <div className="flex items-center border-t border-border px-3 py-2 text-sm text-slate-500">
        <span>
          Tổng số: <b className="text-slate-700">{vouchers.length}</b> bản ghi
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span>{PAGE_SIZE} bản ghi trên 1 trang</span>
          <div className="flex items-center gap-1">
            <button
              className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Trước
            </button>
            <span className="px-2 py-1 text-slate-700">
              {page} / {pageCount}
            </span>
            <button
              className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
              disabled={page >= pageCount}
              onClick={() => setPage(page + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Gộp dòng hạch toán theo chứng từ + chọn tối đa MAX_PIVOT_COLUMNS TK đối ứng
// có tổng phát sinh lớn nhất làm cột riêng (hiển thị theo thứ tự mã TK).
// TK ngoài cột pivot (kể cả rỗng do dữ liệu nhập khẩu thiếu định khoản) vào "TK khác".
function buildPivot(lines: CashJournalRowDto[]) {
  const totals = new Map<string, number>()
  for (const l of lines) {
    totals.set(l.counterAccount, (totals.get(l.counterAccount) ?? 0) + Number(l.amount))
  }
  const accounts = [...totals.entries()]
    .filter(([acc]) => acc !== '')
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_PIVOT_COLUMNS)
    .map(([acc]) => acc)
    .sort()
  const pivotSet = new Set(accounts)

  const byVoucher = new Map<string, VoucherRow>()
  let otherTotal = 0
  for (const l of lines) {
    let v = byVoucher.get(l.voucherId)
    if (!v) {
      v = {
        voucherId: l.voucherId,
        postingDate: l.postingDate,
        voucherNo: l.voucherNo,
        voucherDate: l.voucherDate,
        description: l.description,
        total: 0,
        byAccount: new Map(),
        otherAmount: 0,
        otherCodes: [],
      }
      byVoucher.set(l.voucherId, v)
    }
    const amount = Number(l.amount)
    v.total += amount
    if (pivotSet.has(l.counterAccount)) {
      v.byAccount.set(l.counterAccount, (v.byAccount.get(l.counterAccount) ?? 0) + amount)
    } else {
      v.otherAmount += amount
      otherTotal += amount
      if (l.counterAccount && !v.otherCodes.includes(l.counterAccount)) {
        v.otherCodes.push(l.counterAccount)
      }
    }
  }

  const accountTotals = new Map(accounts.map((acc) => [acc, totals.get(acc) ?? 0]))
  return { vouchers: [...byVoucher.values()], accounts, accountTotals, otherTotal }
}

// Kỳ báo cáo: trọn 1 tháng → "Tháng M năm Y", ngược lại "Từ ngày … đến ngày …".
function periodLabel(filter: CashReportFilter): string {
  const [fy, fm, fd] = filter.fromDate.split('-').map(Number)
  const [ty, tm, td] = filter.toDate.split('-').map(Number)
  if (
    fy !== undefined && fm !== undefined && fd === 1 &&
    fy === ty && fm === tm && td === new Date(fy, fm, 0).getDate()
  ) {
    return `Tháng ${fm} năm ${fy}`
  }
  return `Từ ngày ${formatDate(filter.fromDate)} đến ngày ${formatDate(filter.toDate)}`
}
