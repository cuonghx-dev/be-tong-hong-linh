import {
  CashVoucherCategory,
  CashVoucherType,
  PurchaseVoucherType,
  type PurchaseVoucherDto,
  type PurchaseVoucherFilter,
} from '@app/shared'
import { useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { AddMenu } from '@/shared/ui/add-menu'
import { RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { RowActionMenu } from '@/shared/ui/row-action-menu'
import { useToast } from '@/shared/ui/toast'
import { usePurchaseVouchers } from '../api/usePurchaseVouchers'
import {
  useImportPurchaseVouchers,
  useSetPurchaseVoucherPosted,
} from '../api/usePurchaseVoucherMutations'
import { PAYMENT_STATUS_LABEL, RECEIVE_STATUS_LABEL, purchaseReasonLabel } from '../types'
import {
  PurchaseFilterPopover,
  type PurchaseFilterValue,
} from './PurchaseFilterPopover'

const PAGE_SIZE = 20

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

export function PurchaseTable() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const setPosted = useSetPurchaseVoucherPosted()
  const importXlsx = useImportPurchaseVouchers()
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Điều hướng sang trang chứng từ full-page (§5).
  const openNew = (type: PurchaseVoucherType) => navigate(`/purchase/vouchers/new?type=${type}`)
  const openView = (id: string, type: PurchaseVoucherType) =>
    navigate(`/purchase/vouchers/${id}?type=${type}`)
  // Nhân bản: mở form tạo mới, điền sẵn dữ liệu chứng từ nguồn (số chứng từ cấp lại khi Lưu).
  const openDuplicate = (id: string, type: PurchaseVoucherType) =>
    navigate(`/purchase/vouchers/new?type=${type}&duplicateFrom=${id}`)
  // Trả tiền NCC: mở phiếu chi tiền mặt điền sẵn NCC + số tiền (định khoản Nợ 331/Có 111).
  const openPay = (r: PurchaseVoucherDto) => {
    const q = new URLSearchParams({
      type: CashVoucherType.Payment,
      category: CashVoucherCategory.PaymentSupplier,
      amount: r.totalPayment,
    })
    if (r.supplierId) q.set('partnerId', r.supplierId)
    if (r.supplierName) q.set('partnerName', r.supplierName)
    navigate(`/cash/vouchers/new?${q.toString()}`)
  }

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // cho phép chọn lại cùng file
    if (!file) return
    importXlsx.mutate(file, {
      onSuccess: (r) =>
        toast({
          variant: 'success',
          title: 'Nhập khẩu thành công',
          description: `${r.created} chứng từ mới, bỏ qua ${r.skipped} trùng (tổng ${r.total}).`,
        }),
      onError: () =>
        toast({
          variant: 'error',
          title: 'Nhập khẩu thất bại',
          description: 'Kiểm tra lại file Excel.',
        }),
    })
  }

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

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={onPickFile}
        />

        <div className="ml-auto flex items-center gap-2">
          <AddMenu
            actions={[
              { label: 'Chứng từ mua hàng', onClick: () => openNew(PurchaseVoucherType.Stock) },
            ]}
            onImportExcel={() => fileRef.current?.click()}
            importing={importXlsx.isPending}
          />

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
          <thead className="sticky top-0 z-20 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-10 px-3 py-2 text-center">
                <input type="checkbox" />
              </th>
              <th className="px-3 py-2">Ngày hạch toán</th>
              <th className="px-3 py-2">Số chứng từ</th>
              <th className="px-3 py-2">Nhà cung cấp</th>
              <th className="px-3 py-2 text-right">Tổng tiền thanh toán</th>
              <th className="px-3 py-2 text-right">Chi phí mua hàng</th>
              <th className="px-3 py-2 text-right">Giá trị nhập kho</th>
              <th className="px-3 py-2">TT nhận hóa đơn</th>
              <th className="px-3 py-2">TT thanh toán</th>
              <th className="px-3 py-2">Loại chứng từ</th>
              <th className="sticky right-0 z-30 bg-slate-50 px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
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
                    onClick={() => openView(r.id, r.type)}
                  >
                    {r.voucherNo}
                  </button>
                  {!r.posted && (
                    <span className="mt-0.5 block w-fit rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                      Chưa ghi sổ
                    </span>
                  )}
                </td>
                <td
                  className="min-w-[180px] max-w-[280px] px-3 py-2 text-slate-700"
                  title={r.supplierName || ''}
                >
                  <div className="line-clamp-2 break-words">{r.supplierName}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-700">
                  {formatCurrency(Number(r.totalPayment))}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-600">
                  {formatCurrency(Number(r.purchaseCost))}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-600">
                  {formatCurrency(Number(r.stockValue))}
                </td>
                <td className="px-3 py-2 text-slate-600">{RECEIVE_STATUS_LABEL[r.receiveStatus]}</td>
                <td className="px-3 py-2 text-slate-600">{PAYMENT_STATUS_LABEL[r.paymentStatus]}</td>
                <td className="min-w-[160px] px-3 py-2 text-slate-600">
                  {purchaseReasonLabel(r.origin, r.type)}
                </td>
                <td className="sticky right-0 z-10 bg-white px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50">
                  <RowActionMenu
                    primaryLabel="Trả tiền"
                    onPrimary={() => openPay(r)}
                    items={[
                      {
                        label: 'Xem',
                        onClick: () => openView(r.id, r.type),
                      },
                      {
                        label: 'Nhân bản',
                        onClick: () => openDuplicate(r.id, r.type),
                      },
                      {
                        label: r.posted ? 'Bỏ ghi' : 'Ghi sổ',
                        onClick: () =>
                          setPosted.mutate(
                            { id: r.id, posted: !r.posted },
                            {
                              onError: (e) =>
                                toast({
                                  variant: 'error',
                                  title: r.posted ? 'Bỏ ghi thất bại' : 'Ghi sổ thất bại',
                                  description: getApiErrorMessage(e),
                                }),
                            },
                          ),
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

    </div>
  )
}
