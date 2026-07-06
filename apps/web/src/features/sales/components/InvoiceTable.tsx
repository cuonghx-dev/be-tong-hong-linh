import { InvoiceIssueStatus, type InvoiceFilter } from '@app/shared'
import { useSearchParams } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { formatCurrency } from '@/shared/lib/currency'
import { RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { RowActionMenu } from '@/shared/ui/row-action-menu'
import { useInvoices, useIssueInvoice } from '../api/useInvoices'
import { ISSUE_STATUS_LABEL } from '../types'

const PAGE_SIZE = 20

export function InvoiceTable() {
  const [params, setParams] = useSearchParams()
  const issue = useIssueInvoice()

  const page = Number(params.get('ipage') ?? 1)
  const keyword = params.get('iq') ?? ''

  const filter: InvoiceFilter = { page, pageSize: PAGE_SIZE, keyword: keyword || undefined }
  const { data, isLoading, isError, refetch, isFetching } = useInvoices(filter)
  const rows = data?.data ?? []
  const total = data?.pagination.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'ipage') next.set('ipage', '1')
    setParams(next)
  }

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
              placeholder="Tìm số HĐ / khách hàng"
              defaultValue={keyword}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setParam('iq', (e.target as HTMLInputElement).value || null)
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
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Ngày hóa đơn</th>
              <th className="px-3 py-2">Số hóa đơn</th>
              <th className="px-3 py-2">Khách hàng</th>
              <th className="px-3 py-2 text-right">Giá trị hóa đơn</th>
              <th className="px-3 py-2">TT phát hành</th>
              <th className="px-3 py-2">Mã của CQT</th>
              <th className="px-3 py-2">Chứng từ</th>
              <th className="sticky right-0 z-20 bg-slate-50 px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
                Chức năng
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-red-500">
                  Lỗi tải dữ liệu.{' '}
                  <button className="underline" onClick={() => refetch()}>
                    Thử lại
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-slate-400">
                  Chưa có hóa đơn nào. Lập chứng từ bán hàng kèm hóa đơn để sinh HĐ.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const issued = r.issueStatus === InvoiceIssueStatus.CodeIssued
              return (
                <tr key={r.id} className="group border-t border-border hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {formatDate(r.invoiceDate)}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-700">{r.invoiceNo ?? '—'}</td>
                  <td
                    className="max-w-[220px] truncate px-3 py-2 text-slate-700"
                    title={r.customerName || ''}
                  >
                    {r.customerName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-800">
                    {formatCurrency(Number(r.totalAmount))}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-xs',
                        issued ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
                      )}
                    >
                      {ISSUE_STATUS_LABEL[r.issueStatus]}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-slate-600" title={r.taxAuthorityCode || ''}>
                    {r.taxAuthorityCode ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.salesVoucherNo ?? '—'}</td>
                  <td className="sticky right-0 z-10 bg-white px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50">
                    <RowActionMenu
                      primaryLabel={r.lookupUrl ? 'Tra cứu' : 'Xem'}
                      onPrimary={() => {
                        if (r.lookupUrl) window.open(r.lookupUrl, '_blank')
                      }}
                      items={
                        issued
                          ? [{ label: 'Đã cấp mã', onClick: () => {} }]
                          : [
                              {
                                label: issue.isPending ? 'Đang phát hành…' : 'Phát hành (cấp mã)',
                                onClick: () => issue.mutate(r.id),
                              },
                            ]
                      }
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
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
            onClick={() => setParam('ipage', String(page - 1))}
          >
            Trước
          </button>
          <span className="px-2 py-1 text-slate-700">
            {page} / {pageCount}
          </span>
          <button
            className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
            disabled={page >= pageCount}
            onClick={() => setParam('ipage', String(page + 1))}
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}
