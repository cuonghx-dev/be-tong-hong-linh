import { SalesPaymentMode, SalesVoucherType, type SalesVoucherFilter } from '@app/shared'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { formatCurrency } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import { RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { Modal } from '@/shared/ui/modal'
import { RowActionMenu } from '@/shared/ui/row-action-menu'
import { useSalesVouchers } from '../api/useSalesVouchers'
import { useDeleteSalesVoucher } from '../api/useSalesVoucherMutations'
import { PAYMENT_MODE_LABEL, VOUCHER_TYPE_LABEL } from '../types'
import { SalesFilterPopover, type SalesFilterValue } from './SalesFilterPopover'
import { SalesVoucherForm } from './SalesVoucherForm'

const PAGE_SIZE = 20

export function SalesVoucherTable() {
  const [params, setParams] = useSearchParams()
  const [form, setForm] = useState<{ voucherId?: string } | null>(null)
  const del = useDeleteSalesVoucher()

  const page = Number(params.get('page') ?? 1)
  const keyword = params.get('q') ?? ''
  const voucherType = (params.get('type') as SalesVoucherType | null) ?? null
  const paymentMode = (params.get('pay') as SalesPaymentMode | null) ?? null
  const fromDate = params.get('from') ?? ''
  const toDate = params.get('to') ?? ''

  const filter: SalesVoucherFilter = {
    page,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
    voucherType: voucherType ?? undefined,
    paymentMode: paymentMode ?? undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  }
  const { data, isLoading, isError, refetch, isFetching } = useSalesVouchers(filter)
  const rows = data?.data ?? []
  const total = data?.pagination.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setParams(next)
  }

  const applyFilter = (v: SalesFilterValue) => {
    const next = new URLSearchParams(params)
    for (const [k, val] of Object.entries({
      type: v.voucherType,
      pay: v.paymentMode,
      from: v.from,
      to: v.to,
    })) {
      if (val) next.set(k, val)
      else next.delete(k)
    }
    next.set('page', '1')
    setParams(next)
  }

  const resetFilter = () => {
    const next = new URLSearchParams(params)
    ;['type', 'pay', 'from', 'to'].forEach((k) => next.delete(k))
    next.set('page', '1')
    setParams(next)
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <SalesFilterPopover
          value={{
            voucherType: voucherType ?? '',
            paymentMode: paymentMode ?? '',
            from: fromDate,
            to: toDate,
          }}
          onApply={applyFilter}
          onReset={resetFilter}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => setForm({})}>
            Thêm chứng từ
          </Button>
          <div className="relative">
            <SearchIcon
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              placeholder="Tìm kiếm"
              defaultValue={keyword}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setParam('q', (e.target as HTMLInputElement).value || null)
              }}
              className="h-8 w-44 rounded-md border border-border pl-8 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Ngày hạch toán</th>
              <th className="px-3 py-2">Số chứng từ</th>
              <th className="px-3 py-2">Số hóa đơn</th>
              <th className="px-3 py-2">Khách hàng</th>
              <th className="px-3 py-2 text-right">Tổng tiền thanh toán</th>
              <th className="px-3 py-2">TT lập hóa đơn</th>
              <th className="px-3 py-2">TT thanh toán</th>
              <th className="px-3 py-2">Loại nghiệp vụ</th>
              <th className="sticky right-0 z-20 bg-slate-50 px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
                Chức năng
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-red-500">
                  Lỗi tải dữ liệu.{' '}
                  <button className="underline" onClick={() => refetch()}>
                    Thử lại
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-slate-400">
                  Chưa có chứng từ bán hàng nào.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="group border-t border-border hover:bg-slate-50">
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                  {formatDate(r.postingDate)}
                </td>
                <td className="px-3 py-2">
                  <button
                    className="text-primary hover:underline"
                    onClick={() => setForm({ voucherId: r.id })}
                  >
                    {r.voucherNo}
                  </button>
                </td>
                <td className="px-3 py-2 text-slate-600">{r.invoiceNo ?? '—'}</td>
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
                  <Badge on={r.withInvoice} onLabel="Đã lập" offLabel="Chưa lập" />
                </td>
                <td className="px-3 py-2">
                  <Badge
                    on={r.paymentMode === SalesPaymentMode.PaidNow}
                    onLabel="Đã thanh toán"
                    offLabel={PAYMENT_MODE_LABEL[SalesPaymentMode.Unpaid]}
                  />
                </td>
                <td className="px-3 py-2 text-slate-600">{VOUCHER_TYPE_LABEL[r.voucherType]}</td>
                <td className="sticky right-0 z-10 bg-white px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50">
                  <RowActionMenu
                    onPrimary={() => setForm({ voucherId: r.id })}
                    items={[
                      { label: 'Sửa', onClick: () => setForm({ voucherId: r.id }) },
                      {
                        label: 'Xóa',
                        danger: true,
                        onClick: () => {
                          if (confirm(`Xóa chứng từ ${r.voucherNo}?`)) del.mutate(r.id)
                        },
                      },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center border-t border-border px-3 py-2 text-sm text-slate-500">
        <span>
          Tổng số: <b className="text-slate-700">{total}</b> bản ghi
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span>{PAGE_SIZE} bản ghi trên 1 trang</span>
          <div className="flex items-center gap-1">
            <button
              className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setParam('page', String(page - 1))}
            >
              Trước
            </button>
            <span className="px-2 py-1 text-slate-700">
              {page} / {pageCount}
            </span>
            <button
              className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
              disabled={page >= pageCount}
              onClick={() => setParam('page', String(page + 1))}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        size="xl"
        title={form?.voucherId ? 'Sửa chứng từ bán hàng' : 'Chứng từ bán hàng'}
      >
        {form && (
          <SalesVoucherForm
            key={form.voucherId ?? 'new'}
            voucherId={form.voucherId ?? null}
            onSaved={() => setForm(null)}
            onCancel={() => setForm(null)}
          />
        )}
      </Modal>
    </div>
  )
}

function Badge({ on, onLabel, offLabel }: { on: boolean; onLabel: string; offLabel: string }) {
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-xs',
        on ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
      )}
    >
      {on ? onLabel : offLabel}
    </span>
  )
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}
