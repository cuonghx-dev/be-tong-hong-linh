import type { PurchaseReportFilter } from '@app/shared'
import { useSearchParams } from 'react-router-dom'
import { usePurchaseDetailReport } from '../../api/usePurchaseReports'
import { formatDate, money, periodLabel, quantity } from '@/shared/lib/report-format'
import { StatusRow, tdClass, tdMoney, thClass } from '@/shared/ui/report-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const PAGE_SIZE = 20
const COL_SPAN = 13

// Sổ chi tiết mua hàng — mỗi dòng hàng của chứng từ mua trong kỳ 1 dòng sổ.
export function PurchaseDetailReport({ filter }: { filter: PurchaseReportFilter }) {
  const { data, isLoading, isError } = usePurchaseDetailReport(filter)
  const [params, setParams] = useSearchParams()

  const rows = data?.rows ?? []
  const page = Math.max(1, Number(params.get('page') ?? 1))
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const setPage = (p: number) => {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    setParams(next, { replace: true })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">
        <div className="py-4 text-center">
          <div className="text-lg font-bold uppercase text-slate-800">Sổ chi tiết mua hàng</div>
          <div className="text-sm italic text-slate-500">{periodLabel(filter)}</div>
        </div>

        <Table className="min-w-[1100px]">
          <TableHeader>
            <TableRow>
              <TableHead rowSpan={2} className={thClass}>Ngày hạch&nbsp;toán</TableHead>
              <TableHead colSpan={2} className={`${thClass} text-center`}>Chứng&nbsp;từ</TableHead>
              <TableHead rowSpan={2} className={thClass}>Số hóa&nbsp;đơn</TableHead>
              <TableHead rowSpan={2} className={thClass}>Nhà cung&nbsp;cấp</TableHead>
              <TableHead rowSpan={2} className={thClass}>Diễn&nbsp;giải</TableHead>
              <TableHead rowSpan={2} className={thClass}>Mặt&nbsp;hàng</TableHead>
              <TableHead rowSpan={2} className={thClass}>ĐVT</TableHead>
              <TableHead rowSpan={2} className={`${thClass} text-right`}>Số&nbsp;lượng</TableHead>
              <TableHead rowSpan={2} className={`${thClass} text-right`}>Đơn&nbsp;giá</TableHead>
              <TableHead rowSpan={2} className={`${thClass} text-right`}>Thành&nbsp;tiền</TableHead>
              <TableHead rowSpan={2} className={`${thClass} text-right`}>Thuế&nbsp;GTGT</TableHead>
              <TableHead rowSpan={2} className={`${thClass} text-right`}>Tổng thanh&nbsp;toán</TableHead>
            </TableRow>
            <TableRow>
              <TableHead className={thClass}>Số&nbsp;hiệu</TableHead>
              <TableHead className={thClass}>Ngày&nbsp;tháng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
            {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
            {!isLoading && !isError && rows.length === 0 && (
              <StatusRow colSpan={COL_SPAN}>Không có phát sinh trong kỳ.</StatusRow>
            )}
            {pageRows.map((r, i) => (
              <TableRow key={`${r.voucherId}-${i}`}>
                <TableCell className={`${tdClass} whitespace-nowrap`}>{formatDate(r.postingDate)}</TableCell>
                <TableCell className={`${tdClass} whitespace-nowrap`}>{r.voucherNo}</TableCell>
                <TableCell className={`${tdClass} whitespace-nowrap`}>{formatDate(r.voucherDate)}</TableCell>
                <TableCell className={`${tdClass} whitespace-nowrap`}>{r.invoiceNo}</TableCell>
                {/* Đối tượng: hiện đầy đủ, không cắt ngắn. */}
                <TableCell className={`${tdClass} min-w-[200px] whitespace-normal break-words`}>
                  {r.supplierName}
                </TableCell>
                <TableCell className={`${tdClass} max-w-[260px] truncate`} title={r.description ?? ''}>
                  {r.description}
                </TableCell>
                <TableCell className={`${tdClass} max-w-[200px] truncate`} title={r.itemName ?? ''}>
                  {r.itemName ?? '(Không chọn mặt hàng)'}
                </TableCell>
                <TableCell className={tdClass}>{r.unit}</TableCell>
                <TableCell className={tdMoney}>{quantity(r.quantity)}</TableCell>
                <TableCell className={tdMoney}>{money(r.unitPrice)}</TableCell>
                <TableCell className={tdMoney}>{money(r.amount)}</TableCell>
                <TableCell className={tdMoney}>{money(r.vatAmount)}</TableCell>
                <TableCell className={tdMoney}>{money(r.totalPayment, true)}</TableCell>
              </TableRow>
            ))}
            {rows.length > 0 && (
              <TableRow className="bg-slate-50 font-semibold">
                <TableCell colSpan={10} className={tdClass}>Tổng cộng</TableCell>
                <TableCell className={tdMoney}>{money(data?.totalAmount ?? '0', true)}</TableCell>
                <TableCell className={tdMoney}>{money(data?.totalVat ?? '0', true)}</TableCell>
                <TableCell className={tdMoney}>{money(data?.totalPayment ?? '0', true)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer phân trang — theo pattern bảng danh sách (§3) */}
      <div className="flex items-center border-t border-border px-3 py-2 text-sm text-slate-500">
        <span>
          Tổng số: <b className="text-slate-700">{rows.length}</b> bản ghi
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
