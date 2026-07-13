import { formatCurrency } from '@/shared/lib/currency'

// Helpers hiển thị dùng chung cho các bảng báo cáo bán hàng
// (đối xứng với features/purchase/components/reports/report-utils.tsx).

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
export function quantity(value: string): string {
  const n = Number(value)
  if (n === 0) return ''
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
