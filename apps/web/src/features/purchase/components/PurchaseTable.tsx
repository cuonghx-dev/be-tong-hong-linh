import { PurchaseVoucherType, type PurchaseVoucherFilter } from '@app/shared'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatCurrency } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import { ChevronDownIcon, RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { Modal } from '@/shared/ui/modal'
import { Popover } from '@/shared/ui/popover'
import { RowActionMenu } from '@/shared/ui/row-action-menu'
import { usePurchaseVouchers } from '../api/usePurchaseVouchers'
import { useDeletePurchaseVoucher } from '../api/usePurchaseVoucherMutations'
import { PAYMENT_STATUS_LABEL, RECEIVE_STATUS_LABEL, VOUCHER_TYPE_LABEL } from '../types'
import {
  PurchaseFilterPopover,
  type PurchaseFilterValue,
} from './PurchaseFilterPopover'
import { PurchaseVoucherForm } from './PurchaseVoucherForm'

const PAGE_SIZE = 20

interface FormState {
  type: PurchaseVoucherType
  voucherId?: string
}

const NEW_TYPES: { type: PurchaseVoucherType; label: string }[] = [
  { type: PurchaseVoucherType.Stock, label: 'Mua hàng nhập kho' },
  { type: PurchaseVoucherType.NonStock, label: 'Mua hàng không qua kho' },
  { type: PurchaseVoucherType.Service, label: 'Mua dịch vụ' },
]

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

export function PurchaseTable() {
  const [params, setParams] = useSearchParams()
  const [formState, setFormState] = useState<FormState | null>(null)
  const del = useDeletePurchaseVoucher()

  const page = Number(params.get('page') ?? 1)
  const keyword = params.get('q') ?? ''
  const typeParam = (params.get('type') as PurchaseVoucherType | null) ?? null
  const receiveStatus = params.get('receive') ?? ''
  const paymentStatus = params.get('payment') ?? ''
  const fromDate = params.get('from') ?? ''
  const toDate = params.get('to') ?? ''

  const filter: PurchaseVoucherFilter = {
    page,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
    type: typeParam ?? undefined,
    receiveStatus: (receiveStatus || undefined) as PurchaseVoucherFilter['receiveStatus'],
    paymentStatus: (paymentStatus || undefined) as PurchaseVoucherFilter['paymentStatus'],
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  }
  const { data, isLoading, isError, refetch, isFetching } = usePurchaseVouchers(filter)

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

  const applyFilter = (v: PurchaseFilterValue) => {
    const next = new URLSearchParams(params)
    for (const [k, val] of Object.entries({
      type: v.type,
      receive: v.receiveStatus,
      payment: v.paymentStatus,
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
    ;['type', 'receive', 'payment', 'from', 'to'].forEach((k) => next.delete(k))
    next.set('page', '1')
    setParams(next)
  }

  const closeForm = () => setFormState(null)

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <PurchaseFilterPopover
          value={{
            type: typeParam ?? '',
            receiveStatus,
            paymentStatus,
            from: fromDate,
            to: toDate,
          }}
          onApply={applyFilter}
          onReset={resetFilter}
        />

        <div className="ml-auto flex items-center gap-2">
          <Popover
            align="right"
            className="w-56"
            trigger={({ open, toggle }) => (
              <Button size="sm" onClick={toggle} aria-expanded={open}>
                Thêm <ChevronDownIcon size={14} />
              </Button>
            )}
          >
            {(close) => (
              <div className="flex flex-col">
                {NEW_TYPES.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => {
                      setFormState({ type: t.type })
                      close()
                    }}
                    className="rounded px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </Popover>

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
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-10 px-3 py-2 text-center">
                <input type="checkbox" />
              </th>
              <th className="px-3 py-2">Ngày hạch toán</th>
              <th className="px-3 py-2">Số chứng từ</th>
              <th className="px-3 py-2">Số hóa đơn</th>
              <th className="px-3 py-2">Nhà cung cấp</th>
              <th className="px-3 py-2 text-right">Tổng tiền TT</th>
              <th className="px-3 py-2 text-right">Giá trị nhập kho</th>
              <th className="px-3 py-2">TT nhận HĐ</th>
              <th className="px-3 py-2">TT thanh toán</th>
              <th className="px-3 py-2">Loại chứng từ</th>
              <th className="sticky right-0 z-20 bg-slate-50 px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
                Chức năng
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-red-500">
                  Lỗi tải dữ liệu.{' '}
                  <button className="underline" onClick={() => refetch()}>
                    Thử lại
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-slate-400">
                  Chưa có chứng từ mua hàng nào.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="group border-t border-border hover:bg-slate-50">
                <td className="px-3 py-2 text-center">
                  <input type="checkbox" />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                  {formatDate(r.postingDate)}
                </td>
                <td className="px-3 py-2">
                  <button
                    className="text-primary hover:underline"
                    onClick={() => setFormState({ type: r.type, voucherId: r.id })}
                  >
                    {r.voucherNo}
                  </button>
                </td>
                <td className="px-3 py-2 text-slate-600">{r.invoiceNo}</td>
                <td className="max-w-[180px] truncate px-3 py-2 text-slate-700">
                  {r.supplierName}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-700">
                  {formatCurrency(Number(r.totalPayment))}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-600">
                  {formatCurrency(Number(r.stockValue))}
                </td>
                <td className="px-3 py-2 text-slate-600">{RECEIVE_STATUS_LABEL[r.receiveStatus]}</td>
                <td className="px-3 py-2 text-slate-600">{PAYMENT_STATUS_LABEL[r.paymentStatus]}</td>
                <td className="px-3 py-2 text-slate-600">{VOUCHER_TYPE_LABEL[r.type]}</td>
                <td className="sticky right-0 z-10 bg-white px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50">
                  <RowActionMenu
                    onPrimary={() => setFormState({ type: r.type, voucherId: r.id })}
                    items={[
                      {
                        label: 'Sửa',
                        onClick: () => setFormState({ type: r.type, voucherId: r.id }),
                      },
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

      {/* Footer / phân trang */}
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

      {/* Form modal */}
      <Modal
        open={!!formState}
        onClose={closeForm}
        size="xl"
        title={
          formState?.voucherId
            ? `Sửa chứng từ mua hàng`
            : formState
              ? VOUCHER_TYPE_LABEL[formState.type]
              : ''
        }
      >
        {formState && (
          <PurchaseVoucherForm
            key={`${formState.type}-${formState.voucherId ?? 'new'}`}
            type={formState.type}
            voucherId={formState.voucherId ?? null}
            onSaved={closeForm}
            onCancel={closeForm}
          />
        )}
      </Modal>
    </div>
  )
}
