import type { StockSummaryFilter } from '@app/shared'
import { useStockSummary } from '../../api/useInventoryReports'
import { money, periodLabel, quantity } from '@/shared/lib/report-format'
import { StatusRow, tdClass, tdMoney, thClass } from '@/shared/ui/report-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const COL_SPAN = 11

// Tổng hợp tồn kho: mỗi VTHH 1 dòng — tồn đầu kỳ / nhập / xuất / tồn cuối kỳ
// (SL + giá trị do BE tính bằng Decimal). Dòng tổng cộng chỉ cộng giá trị.
export function StockSummaryReport({ filter }: { filter: StockSummaryFilter }) {
  const { data, isLoading, isError } = useStockSummary(filter)
  const rows = data?.rows ?? []

  return (
    <div className="p-3">
      <div className="pb-2 text-sm text-slate-500">{periodLabel(filter)}</div>
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow>
            <TableHead rowSpan={2} className={thClass}>Mã VTHH</TableHead>
            <TableHead rowSpan={2} className={thClass}>Tên VTHH</TableHead>
            <TableHead rowSpan={2} className={thClass}>ĐVT</TableHead>
            <TableHead colSpan={2} className={thClass}>Tồn đầu&nbsp;kỳ</TableHead>
            <TableHead colSpan={2} className={thClass}>Nhập trong&nbsp;kỳ</TableHead>
            <TableHead colSpan={2} className={thClass}>Xuất trong&nbsp;kỳ</TableHead>
            <TableHead colSpan={2} className={thClass}>Tồn cuối&nbsp;kỳ</TableHead>
          </TableRow>
          <TableRow>
            <TableHead className={thClass}>SL</TableHead>
            <TableHead className={thClass}>Giá&nbsp;trị</TableHead>
            <TableHead className={thClass}>SL</TableHead>
            <TableHead className={thClass}>Giá&nbsp;trị</TableHead>
            <TableHead className={thClass}>SL</TableHead>
            <TableHead className={thClass}>Giá&nbsp;trị</TableHead>
            <TableHead className={thClass}>SL</TableHead>
            <TableHead className={thClass}>Giá&nbsp;trị</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
          {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
          {!isLoading && !isError && rows.length === 0 && (
            <StatusRow colSpan={COL_SPAN}>Không có số dư/phát sinh tồn kho trong kỳ.</StatusRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.itemCode}>
              <TableCell className={`${tdClass} whitespace-nowrap`}>{r.itemCode}</TableCell>
              <TableCell className={`${tdClass} max-w-[280px] truncate`} title={r.itemName ?? ''}>
                {r.itemName}
              </TableCell>
              <TableCell className={tdClass}>{r.unit}</TableCell>
              <TableCell className={tdMoney}>{quantity(r.openingQty)}</TableCell>
              <TableCell className={tdMoney}>{money(r.openingAmount)}</TableCell>
              <TableCell className={tdMoney}>{quantity(r.inQty)}</TableCell>
              <TableCell className={tdMoney}>{money(r.inAmount)}</TableCell>
              <TableCell className={tdMoney}>{quantity(r.outQty)}</TableCell>
              <TableCell className={tdMoney}>{money(r.outAmount)}</TableCell>
              <TableCell className={tdMoney}>{quantity(r.closingQty)}</TableCell>
              <TableCell className={tdMoney}>{money(r.closingAmount)}</TableCell>
            </TableRow>
          ))}
          {data && rows.length > 0 && (
            <TableRow className="bg-slate-50/60 font-semibold">
              <TableCell colSpan={3} className={tdClass}>Tổng cộng</TableCell>
              <TableCell className={tdMoney} />
              <TableCell className={tdMoney}>{money(data.totalOpeningAmount, true)}</TableCell>
              <TableCell className={tdMoney} />
              <TableCell className={tdMoney}>{money(data.totalInAmount, true)}</TableCell>
              <TableCell className={tdMoney} />
              <TableCell className={tdMoney}>{money(data.totalOutAmount, true)}</TableCell>
              <TableCell className={tdMoney} />
              <TableCell className={tdMoney}>{money(data.totalClosingAmount, true)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
