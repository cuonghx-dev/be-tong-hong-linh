import type { ReactNode } from 'react'
import { TableCell, TableRow } from '@/shared/ui/table'

// Kiểu ô của bảng BÁO CÁO (khác bảng danh sách): lưới có viền, giống mẫu sổ in.
export const thClass =
  'border border-border bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500'
export const tdClass = 'border border-border px-3 py-1.5 text-slate-700'
export const tdMoney = `${tdClass} whitespace-nowrap text-right tabular-nums`

// Ô trạng thái chiếm cả bảng (đang tải / lỗi / rỗng).
export function StatusRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-slate-400">
        {children}
      </TableCell>
    </TableRow>
  )
}
