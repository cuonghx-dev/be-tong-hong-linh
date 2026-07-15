import { SalesPaymentMode, SalesVoucherType, type SalesVoucherFilter } from '@app/shared'
import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '@/shared/lib/api'
import { cn } from '@/shared/lib/cn'
import { formatCurrency } from '@/shared/lib/currency'
import { AddMenu } from '@/shared/ui/add-menu'
import { useConfirm } from '@/shared/ui/confirm-dialog'
import { RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { RowActionMenu } from '@/shared/ui/row-action-menu'
import { useToast } from '@/shared/ui/toast'
import { useSalesVouchers } from '../api/useSalesVouchers'
import {
  useDeleteSalesVoucher,
  useImportSalesVouchers,
  useSetSalesVoucherPosted,
} from '../api/useSalesVoucherMutations'
import { PAYMENT_MODE_LABEL } from '../types'
import { IssueInvoiceDialog } from './IssueInvoiceDialog'
import { SalesFilterPopover, type SalesFilterValue } from './SalesFilterPopover'

const PAGE_SIZE = 20

export function SalesVoucherTable() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const del = useDeleteSalesVoucher()
  const setPosted = useSetSalesVoucherPosted()
  const importXlsx = useImportSalesVouchers()
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const confirm = useConfirm()
  // Chứng từ đang phát hành hóa đơn (chưa có số HĐ) — null = đóng dialog.
  const [issueFor, setIssueFor] = useState<{ id: string; voucherNo: string } | null>(null)

  // Điều hướng sang trang chứng từ full-page (§5).
  const openNew = () => navigate('/sales/vouchers/new')
  const openView = (id: string) => navigate(`/sales/vouchers/${id}`)
  const openEdit = (id: string) => navigate(`/sales/vouchers/${id}/edit`)
  // Nhân bản: mở form tạo mới, điền sẵn dữ liệu chứng từ nguồn (số chứng từ cấp lại khi Lưu).
  const openDuplicate = (id: string) => navigate(`/sales/vouchers/new?duplicateFrom=${id}`)

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
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={onPickFile}
        />

        <div className="ml-auto flex items-center gap-2">
          <AddMenu
            actions={[{ label: 'Chứng từ bán hàng', onClick: openNew }]}
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
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Ngày hạch toán</th>
              <th className="px-3 py-2">Số chứng từ</th>
              <th className="px-3 py-2">Số hóa đơn</th>
              <th className="px-3 py-2">Khách hàng</th>
              <th className="px-3 py-2 text-right">Tổng tiền thanh toán</th>
              <th className="px-3 py-2">TT lập hóa đơn</th>
              <th className="px-3 py-2">TT thanh toán</th>
              <th className="px-3 py-2">TT xuất hàng</th>
              <th className="sticky right-0 z-30 bg-slate-50 px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
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
                    onClick={() => openView(r.id)}
                  >
                    {r.voucherNo}
                  </button>
                  {!r.posted && (
                    <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                      Chưa ghi sổ
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.invoiceNo}</td>
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
                <td className="px-3 py-2">
                  <Badge on={r.isInventoryIssue} onLabel="Đã xuất" offLabel="Chưa xuất" />
                </td>
                <td className="sticky right-0 z-10 bg-white px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50">
                  {/* Chưa có số hóa đơn → hành động chính là Phát hành hóa đơn, Xem lùi vào menu */}
                  <RowActionMenu
                    primaryLabel={r.invoiceNo ? 'Xem' : 'Phát hành hóa đơn'}
                    onPrimary={() =>
                      r.invoiceNo
                        ? openView(r.id)
                        : setIssueFor({ id: r.id, voucherNo: r.voucherNo })
                    }
                    items={[
                      ...(r.invoiceNo ? [] : [{ label: 'Xem', onClick: () => openView(r.id) }]),
                      { label: 'Sửa', onClick: () => openEdit(r.id) },
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
                      { label: 'Nhân bản', onClick: () => openDuplicate(r.id) },
                      {
                        label: 'Gửi CT qua email',
                        onClick: () => {
                          const subject = `Chứng từ bán hàng ${r.voucherNo}`
                          const body = `Kính gửi ${r.customerName ?? 'Quý khách'},\n\nGửi kèm chứng từ bán hàng ${r.voucherNo} ngày ${formatDate(r.postingDate)}, tổng tiền ${formatCurrency(Number(r.totalAmount))} đ.`
                          window.open(
                            `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
                          )
                        },
                      },
                      {
                        label: 'Xóa',
                        danger: true,
                        onClick: async () => {
                          const ok = await confirm({
                            title: `Xóa chứng từ ${r.voucherNo}?`,
                            description: 'Hành động này không thể hoàn tác.',
                            confirmText: 'Xóa',
                            destructive: true,
                          })
                          if (ok)
                            del.mutate(r.id, {
                              onError: (e) =>
                                toast({
                                  variant: 'error',
                                  title: 'Xóa chứng từ thất bại',
                                  description: getApiErrorMessage(e),
                                }),
                            })
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

      <IssueInvoiceDialog voucher={issueFor} onClose={() => setIssueFor(null)} />
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
