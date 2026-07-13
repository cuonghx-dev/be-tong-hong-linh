import { formatCurrency } from '@/shared/lib/currency'

// Helpers hiển thị dùng chung cho các bảng báo cáo kho
// (đối xứng với features/cash/components/reports/report-utils.tsx).

export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

// Số tiền Decimal-string → chuỗi có phân cách nghìn; số 0 để trống cho dễ đọc sổ.
export function money(value: string, showZero = false): string {
  const n = Number(value)
  if (n === 0 && !showZero) return ''
  return formatCurrency(n)
}

// Số lượng Decimal-string → bỏ số 0 thập phân thừa (18,4 trong DB).
export function quantity(value: string, showZero = false): string {
  const n = Number(value)
  if (n === 0 && !showZero) return ''
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 4 })
}

// Ô trạng thái chiếm cả bảng (đang tải / lỗi / rỗng).
export function StatusRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-10 text-center text-slate-400">
        {children}
      </td>
    </tr>
  )
}

export const thClass =
  'border border-border bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500'
export const tdClass = 'border border-border px-3 py-1.5 text-slate-700'
export const tdMoney = `${tdClass} whitespace-nowrap text-right tabular-nums`

// Kỳ báo cáo: trọn 1 tháng → "Tháng M năm Y", ngược lại "Từ ngày … đến ngày …".
export function periodLabel(filter: { fromDate: string; toDate: string }): string {
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
