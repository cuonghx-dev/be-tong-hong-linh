import type { PurchaseReportFilter } from '@app/shared'
import { useSearchParams } from 'react-router-dom'
import { usePurchaseDetailReport } from '../../api/usePurchaseReports'
import { formatDate, money, periodLabel, quantity, StatusRow, tdClass, tdMoney, thClass } from './report-utils'

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

        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead className="sticky top-0 z-20">
            <tr>
              <th rowSpan={2} className={thClass}>Ngày hạch toán</th>
              <th colSpan={2} className={`${thClass} text-center`}>Chứng từ</th>
              <th rowSpan={2} className={thClass}>Số hóa đơn</th>
              <th rowSpan={2} className={thClass}>Nhà cung cấp</th>
              <th rowSpan={2} className={thClass}>Diễn giải</th>
              <th rowSpan={2} className={thClass}>Mặt hàng</th>
              <th rowSpan={2} className={thClass}>ĐVT</th>
              <th rowSpan={2} className={`${thClass} text-right`}>Số lượng</th>
              <th rowSpan={2} className={`${thClass} text-right`}>Đơn giá</th>
              <th rowSpan={2} className={`${thClass} text-right`}>Thành tiền</th>
              <th rowSpan={2} className={`${thClass} text-right`}>Thuế GTGT</th>
              <th rowSpan={2} className={`${thClass} text-right`}>Tổng thanh toán</th>
            </tr>
            <tr>
              <th className={thClass}>Số hiệu</th>
              <th className={thClass}>Ngày tháng</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
            {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
            {!isLoading && !isError && rows.length === 0 && (
              <StatusRow colSpan={COL_SPAN}>Không có phát sinh trong kỳ.</StatusRow>
            )}
            {pageRows.map((r, i) => (
              <tr key={`${r.voucherId}-${i}`} className="hover:bg-slate-50">
                <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.postingDate)}</td>
                <td className={`${tdClass} whitespace-nowrap`}>{r.voucherNo}</td>
                <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.voucherDate)}</td>
                <td className={`${tdClass} whitespace-nowrap`}>{r.invoiceNo}</td>
                <td className={`${tdClass} max-w-[220px] truncate`} title={r.supplierName ?? ''}>
                  {r.supplierName}
                </td>
                <td className={`${tdClass} max-w-[260px] truncate`} title={r.description ?? ''}>
                  {r.description}
                </td>
                <td className={`${tdClass} max-w-[200px] truncate`} title={r.itemName ?? ''}>
                  {r.itemName ?? '(Không chọn mặt hàng)'}
                </td>
                <td className={tdClass}>{r.unit}</td>
                <td className={tdMoney}>{quantity(r.quantity)}</td>
                <td className={tdMoney}>{money(r.unitPrice)}</td>
                <td className={tdMoney}>{money(r.amount)}</td>
                <td className={tdMoney}>{money(r.vatAmount)}</td>
                <td className={tdMoney}>{money(r.totalPayment, true)}</td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="bg-slate-50 font-semibold">
                <td colSpan={10} className={tdClass}>Tổng cộng</td>
                <td className={tdMoney}>{money(data?.totalAmount ?? '0', true)}</td>
                <td className={tdMoney}>{money(data?.totalVat ?? '0', true)}</td>
                <td className={tdMoney}>{money(data?.totalPayment ?? '0', true)}</td>
              </tr>
            )}
          </tbody>
        </table>
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
