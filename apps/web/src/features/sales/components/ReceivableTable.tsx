import type { CustomerFilter } from '@app/shared'
import { useSearchParams } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { formatCurrency } from '@/shared/lib/currency'
import { RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { useReceivables } from '../api/useReceivables'

const PAGE_SIZE = 20

export function ReceivableTable() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('rpage') ?? 1)
  const keyword = params.get('rq') ?? ''

  const filter: CustomerFilter = { page, pageSize: PAGE_SIZE, keyword: keyword || undefined }
  const { data, isLoading, isError, refetch, isFetching } = useReceivables(filter)
  const rows = data?.data ?? []
  const total = data?.pagination.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'rpage') next.set('rpage', '1')
    setParams(next)
  }

  const totalRemaining = rows.reduce((s, r) => s + Number(r.remainingReceivable), 0)

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <SearchIcon
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              placeholder="Tìm mã / tên KH"
              defaultValue={keyword}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setParam('rq', (e.target as HTMLInputElement).value || null)
              }}
              className="h-8 w-52 rounded-md border border-border pl-8 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
            aria-label="Tải lại"
          >
            <RefreshIcon size={16} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Mã KH</th>
              <th className="px-3 py-2">Tên khách hàng</th>
              <th className="px-3 py-2 text-right">Còn phải thu theo HĐ</th>
              <th className="px-3 py-2 text-right">Thu trước / Giảm trừ</th>
              <th className="px-3 py-2 text-right">Còn phải thu</th>
              <th className="px-3 py-2">Mã số thuế</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-red-500">
                  Lỗi tải dữ liệu.{' '}
                  <button className="underline" onClick={() => refetch()}>
                    Thử lại
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-slate-400">
                  Chưa có công nợ.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const remaining = Number(r.remainingReceivable)
              return (
                <tr key={r.customerId} className="border-t border-border hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-700">{r.customerCode}</td>
                  <td className="max-w-[240px] truncate px-3 py-2 text-slate-700" title={r.customerName}>
                    {r.customerName}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                    {formatCurrency(Number(r.receivableByInvoice))}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                    {formatCurrency(Number(r.prepaidOrDeduction))}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2 text-right tabular-nums',
                      remaining < 0 ? 'text-red-600' : 'text-slate-800',
                    )}
                  >
                    {remaining < 0 ? `(${formatCurrency(-remaining)})` : formatCurrency(remaining)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.taxCode}</td>
                </tr>
              )
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="sticky bottom-0 bg-slate-100 font-medium">
              <tr className="border-t border-border">
                <td className="px-3 py-2" colSpan={4}>
                  Tổng (trang này)
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(totalRemaining)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="flex items-center border-t border-border px-3 py-2 text-sm text-slate-500">
        <span>
          Tổng số: <b className="text-slate-700">{total}</b> bản ghi
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setParam('rpage', String(page - 1))}
          >
            Trước
          </button>
          <span className="px-2 py-1 text-slate-700">
            {page} / {pageCount}
          </span>
          <button
            className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
            disabled={page >= pageCount}
            onClick={() => setParam('rpage', String(page + 1))}
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  )
}
