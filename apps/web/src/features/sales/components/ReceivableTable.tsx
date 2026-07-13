import {
  CashVoucherCategory,
  CashVoucherType,
  ReceivableAging,
  ReceivableStatus,
  type CustomerReceivableFilter,
} from '@app/shared'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { formatCurrency } from '@/shared/lib/currency'
import { RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { useReceivables } from '../api/useReceivables'
import {
  ReceivableFilterPopover,
  emptyReceivableFilter,
  type ReceivableFilterValue,
} from './ReceivableFilterPopover'

const PAGE_SIZE = 20

export function ReceivableTable() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  // Ghi thu nợ: mở phiếu thu tiền mặt, loại "Thu tiền khách hàng" (TK Có 131), điền sẵn KH.
  const collect = (customerId: string, customerName: string) =>
    navigate(
      `/cash/vouchers/new?type=${CashVoucherType.Receipt}&category=${CashVoucherCategory.ReceiptCustomer}` +
        `&partnerId=${customerId}&partnerName=${encodeURIComponent(customerName)}`,
    )

  const page = Number(params.get('rpage') ?? 1)
  const keyword = params.get('rq') ?? ''
  const account = params.get('racc') ?? ''
  const aging = (params.get('raging') as ReceivableAging | null) ?? ReceivableAging.All
  const status = (params.get('rstatus') as ReceivableStatus | null) ?? ReceivableStatus.All
  const toDate = params.get('rto') ?? ''

  const filter: CustomerReceivableFilter = {
    page,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
    account: account || undefined,
    aging: aging !== ReceivableAging.All ? aging : undefined,
    status: status !== ReceivableStatus.All ? status : undefined,
    toDate: toDate || undefined,
  }
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

  const applyFilter = (v: ReceivableFilterValue) => {
    const next = new URLSearchParams(params)
    const map: Record<string, string> = {
      racc: v.account,
      raging: v.aging !== ReceivableAging.All ? v.aging : '',
      rstatus: v.status !== ReceivableStatus.All ? v.status : '',
      rto: v.toDate,
    }
    for (const [k, val] of Object.entries(map)) {
      if (val) next.set(k, val)
      else next.delete(k)
    }
    next.set('rpage', '1')
    setParams(next)
  }

  const resetFilter = () => {
    const next = new URLSearchParams(params)
    ;['racc', 'raging', 'rstatus', 'rto'].forEach((k) => next.delete(k))
    next.set('rpage', '1')
    setParams(next)
  }

  const totalRemaining = rows.reduce((s, r) => s + Number(r.remainingReceivable), 0)

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <ReceivableFilterPopover
          value={{
            ...emptyReceivableFilter(),
            account,
            aging,
            status,
            ...(toDate ? { toDate } : {}),
          }}
          onApply={applyFilter}
          onReset={resetFilter}
        />
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
        <table className="w-full min-w-[1040px] border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Mã KH</th>
              <th className="px-3 py-2">Tên khách hàng</th>
              <th className="px-3 py-2 text-right">Còn phải thu theo HĐ</th>
              <th className="px-3 py-2 text-right">Thu trước / Giảm trừ</th>
              <th className="px-3 py-2 text-right">Còn phải thu</th>
              <th className="px-3 py-2">Địa chỉ</th>
              <th className="px-3 py-2">Mã số thuế</th>
              <th className="sticky right-0 z-30 bg-slate-50 px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
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
                  Chưa có công nợ.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const remaining = Number(r.remainingReceivable)
              return (
                <tr key={r.customerId} className="group border-t border-border hover:bg-slate-50">
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
                  <td className="max-w-[260px] truncate px-3 py-2 text-slate-600" title={r.address ?? ''}>
                    {r.address}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.taxCode}</td>
                  <td className="sticky right-0 z-10 bg-white px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50">
                    <button
                      className="font-medium text-primary hover:underline"
                      onClick={() => collect(r.customerId, r.customerName)}
                    >
                      Thu nợ
                    </button>
                  </td>
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
                <td colSpan={3} />
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
