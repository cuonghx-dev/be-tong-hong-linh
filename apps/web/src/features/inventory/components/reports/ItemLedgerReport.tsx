import type { ItemLedgerFilter, ItemLedgerRowDto } from '@app/shared'
import { useNavigate } from 'react-router-dom'
import { useItemLedger } from '../../api/useInventoryReports'
import { formatDate, money, periodLabel, quantity } from '@/shared/lib/report-format'
import { StatusRow, tdClass, tdMoney, thClass } from '@/shared/ui/report-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const COL_SPAN = 12

// Sổ chi tiết vật tư hàng hóa: dòng dư đầu + từng dòng nhập/xuất trong kỳ với
// tồn lũy kế (SL + giá trị do BE tính bằng Decimal) + cộng phát sinh + dư cuối.
export function ItemLedgerReport({ filter }: { filter: ItemLedgerFilter }) {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useItemLedger(filter)

  if (!filter.itemCode) {
    return <Status>Chọn vật tư hàng hóa để xem sổ chi tiết.</Status>
  }
  if (isLoading) return <Status>Đang tải…</Status>
  if (isError || !data) return <Status>Lỗi tải dữ liệu.</Status>

  // Drill-down: mở trang xem chứng từ gốc (phiếu nhập kho hoặc phiếu xuất kho).
  const openVoucher = (row: ItemLedgerRowDto) => {
    const base = row.voucherKind === 'RECEIPT' ? '/inventory/receipts' : '/inventory/issues'
    navigate(`${base}/${row.voucherId}`)
  }

  return (
    <div className="p-3">
      <div className="flex flex-wrap items-baseline gap-2 pb-2">
        <span className="text-sm font-bold text-slate-700">{data.itemCode}</span>
        {data.itemName && <span className="text-sm text-slate-500">{data.itemName}</span>}
        {data.unit && <span className="text-sm text-slate-500">— ĐVT: {data.unit}</span>}
        <span className="ml-auto text-sm text-slate-500">{periodLabel(filter)}</span>
      </div>
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow>
            <TableHead rowSpan={2} className={thClass}>Ngày hạch&nbsp;toán</TableHead>
            <TableHead rowSpan={2} className={thClass}>Ngày chứng&nbsp;từ</TableHead>
            <TableHead rowSpan={2} className={thClass}>Số chứng&nbsp;từ</TableHead>
            <TableHead rowSpan={2} className={thClass}>Diễn&nbsp;giải</TableHead>
            <TableHead rowSpan={2} className={thClass}>TK đối&nbsp;ứng</TableHead>
            <TableHead rowSpan={2} className={thClass}>Đơn&nbsp;giá</TableHead>
            <TableHead colSpan={2} className={thClass}>Nhập</TableHead>
            <TableHead colSpan={2} className={thClass}>Xuất</TableHead>
            <TableHead colSpan={2} className={thClass}>Tồn</TableHead>
          </TableRow>
          <TableRow>
            <TableHead className={thClass}>SL</TableHead>
            <TableHead className={thClass}>Giá&nbsp;trị</TableHead>
            <TableHead className={thClass}>SL</TableHead>
            <TableHead className={thClass}>Giá&nbsp;trị</TableHead>
            <TableHead className={thClass}>SL</TableHead>
            <TableHead className={thClass}>Giá&nbsp;trị</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="bg-slate-50/60 font-medium">
            <TableCell colSpan={10} className={tdClass}>Số dư đầu kỳ</TableCell>
            <TableCell className={tdMoney}>{quantity(data.openingQty, true)}</TableCell>
            <TableCell className={tdMoney}>{money(data.openingAmount, true)}</TableCell>
          </TableRow>
          {data.rows.length === 0 && (
            <StatusRow colSpan={COL_SPAN}>Không có phát sinh trong kỳ.</StatusRow>
          )}
          {data.rows.map((r, i) => (
            <TableRow key={`${r.voucherId}-${i}`}>
              <TableCell className={`${tdClass} whitespace-nowrap`}>{formatDate(r.postingDate)}</TableCell>
              <TableCell className={`${tdClass} whitespace-nowrap`}>{formatDate(r.voucherDate)}</TableCell>
              <TableCell className={`${tdClass} whitespace-nowrap`}>
                <button className="text-primary hover:underline" onClick={() => openVoucher(r)}>
                  {r.voucherNo}
                </button>
              </TableCell>
              <TableCell className={`${tdClass} max-w-[260px] truncate`} title={r.description ?? ''}>
                {r.description}
              </TableCell>
              <TableCell className={tdClass}>{r.counterAccount}</TableCell>
              <TableCell className={tdMoney}>{money(r.unitPrice)}</TableCell>
              <TableCell className={tdMoney}>{quantity(r.inQty)}</TableCell>
              <TableCell className={tdMoney}>{money(r.inAmount)}</TableCell>
              <TableCell className={tdMoney}>{quantity(r.outQty)}</TableCell>
              <TableCell className={tdMoney}>{money(r.outAmount)}</TableCell>
              <TableCell className={tdMoney}>{quantity(r.balanceQty, true)}</TableCell>
              <TableCell className={tdMoney}>{money(r.balanceAmount, true)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-slate-50/60 font-semibold">
            <TableCell colSpan={6} className={tdClass}>Cộng phát sinh</TableCell>
            <TableCell className={tdMoney}>{quantity(data.totalInQty, true)}</TableCell>
            <TableCell className={tdMoney}>{money(data.totalInAmount, true)}</TableCell>
            <TableCell className={tdMoney}>{quantity(data.totalOutQty, true)}</TableCell>
            <TableCell className={tdMoney}>{money(data.totalOutAmount, true)}</TableCell>
            <TableCell className={tdMoney} />
            <TableCell className={tdMoney} />
          </TableRow>
          <TableRow className="bg-slate-50/60 font-semibold">
            <TableCell colSpan={10} className={tdClass}>Số dư cuối kỳ</TableCell>
            <TableCell className={tdMoney}>{quantity(data.closingQty, true)}</TableCell>
            <TableCell className={tdMoney}>{money(data.closingAmount, true)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}

function Status({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-10 text-center text-slate-400">{children}</div>
}
