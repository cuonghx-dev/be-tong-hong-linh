import type { PurchaseReportFilter } from '@app/shared'
import { usePurchaseByItemReport } from '../../api/usePurchaseReports'
import { money, periodLabel, quantity } from '@/shared/lib/report-format'
import { StatusRow, tdClass, tdMoney, thClass } from '@/shared/ui/report-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const COL_SPAN = 7

// Tổng hợp mua hàng theo mặt hàng — gộp mọi dòng hàng trong kỳ theo mặt hàng.
export function PurchaseByItemReport({ filter }: { filter: PurchaseReportFilter }) {
  const { data, isLoading, isError } = usePurchaseByItemReport(filter)
  const rows = data?.rows ?? []

  return (
    <div className="overflow-auto">
      <div className="py-4 text-center">
        <div className="text-lg font-bold uppercase text-slate-800">
          Tổng hợp mua hàng theo mặt hàng
        </div>
        <div className="text-sm italic text-slate-500">{periodLabel(filter)}</div>
      </div>

      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead className={thClass}>STT</TableHead>
            <TableHead className={thClass}>Mặt&nbsp;hàng</TableHead>
            <TableHead className={thClass}>ĐVT</TableHead>
            <TableHead className={`${thClass} text-right`}>Số&nbsp;lượng</TableHead>
            <TableHead className={`${thClass} text-right`}>Tiền&nbsp;hàng</TableHead>
            <TableHead className={`${thClass} text-right`}>Thuế&nbsp;GTGT</TableHead>
            <TableHead className={`${thClass} text-right`}>Tổng thanh&nbsp;toán</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
          {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
          {!isLoading && !isError && rows.length === 0 && (
            <StatusRow colSpan={COL_SPAN}>Không có phát sinh trong kỳ.</StatusRow>
          )}
          {rows.map((r, i) => (
            <TableRow key={`${r.itemId ?? r.itemName ?? 'none'}-${i}`}>
              <TableCell className={`${tdClass} w-12 text-center`}>{i + 1}</TableCell>
              <TableCell className={tdClass}>{r.itemName ?? '(Không chọn mặt hàng)'}</TableCell>
              <TableCell className={tdClass}>{r.unit}</TableCell>
              <TableCell className={tdMoney}>{quantity(r.quantity)}</TableCell>
              <TableCell className={tdMoney}>{money(r.amount, true)}</TableCell>
              <TableCell className={tdMoney}>{money(r.vatAmount)}</TableCell>
              <TableCell className={tdMoney}>{money(r.total, true)}</TableCell>
            </TableRow>
          ))}
          {rows.length > 0 && (
            <TableRow className="bg-slate-50 font-semibold">
              <TableCell colSpan={4} className={tdClass}>Tổng cộng</TableCell>
              <TableCell className={tdMoney}>{money(data?.totalAmount ?? '0', true)}</TableCell>
              <TableCell className={tdMoney}>{money(data?.totalVat ?? '0', true)}</TableCell>
              <TableCell className={tdMoney}>{money(data?.totalPayment ?? '0', true)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
