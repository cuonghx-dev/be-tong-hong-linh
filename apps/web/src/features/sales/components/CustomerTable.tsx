import { CashVoucherCategory, CashVoucherType, type CustomerFilter } from '@app/shared'
import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { formatCurrency } from '@/shared/lib/currency'
import { AddMenu } from '@/shared/ui/add-menu'
import { useConfirm } from '@/shared/ui/confirm-dialog'
import { RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { Modal } from '@/shared/ui/modal'
import { RowActionMenu } from '@/shared/ui/row-action-menu'
import { useToast } from '@/shared/ui/toast'
import { useCustomers } from '../api/useCustomers'
import {
  useDeleteCustomer,
  useImportCustomers,
  useUpdateCustomer,
} from '../api/useCustomerMutations'
import { CustomerForm } from './CustomerForm'

const PAGE_SIZE = 20

export function CustomerTable() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [form, setForm] = useState<{
    customerId?: string
    duplicateFromId?: string
    readOnly?: boolean
  } | null>(null)
  const del = useDeleteCustomer()
  const upd = useUpdateCustomer()
  const importXlsx = useImportCustomers()
  const fileRef = useRef<HTMLInputElement>(null)
  const confirm = useConfirm()
  const { toast } = useToast()

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // cho phép chọn lại cùng file
    if (!file) return
    importXlsx.mutate(file, {
      onSuccess: (r) =>
        toast({
          variant: 'success',
          title: 'Nhập khẩu thành công',
          description: `${r.created} khách hàng mới, bỏ qua ${r.skipped} trùng (tổng ${r.total}).`,
        }),
      onError: () =>
        toast({
          variant: 'error',
          title: 'Nhập khẩu thất bại',
          description: 'Kiểm tra lại file Excel.',
        }),
    })
  }

  const page = Number(params.get('cpage') ?? 1)
  const keyword = params.get('cq') ?? ''

  const filter: CustomerFilter = { page, pageSize: PAGE_SIZE, keyword: keyword || undefined }
  const { data, isLoading, isError, refetch, isFetching } = useCustomers(filter)
  const rows = data?.data ?? []
  const total = data?.pagination.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'cpage') next.set('cpage', '1')
    setParams(next)
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={onPickFile}
        />
        <div className="ml-auto flex items-center gap-2">
          <AddMenu
            actions={[{ label: 'Khách hàng', onClick: () => setForm({}) }]}
            onImportExcel={() => fileRef.current?.click()}
            importing={importXlsx.isPending}
          />
          <div className="relative">
            <SearchIcon
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              placeholder="Tìm mã / tên / MST"
              defaultValue={keyword}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setParam('cq', (e.target as HTMLInputElement).value || null)
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
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Mã khách&nbsp;hàng</th>
              <th className="px-3 py-2">Tên khách&nbsp;hàng</th>
              <th className="px-3 py-2">Địa&nbsp;chỉ</th>
              <th className="px-3 py-2 text-right">Công&nbsp;nợ</th>
              <th className="px-3 py-2">Mã&nbsp;số thuế/CCCD chủ&nbsp;hộ</th>
              <th className="px-3 py-2">Điện&nbsp;thoại</th>
              <th className="sticky right-0 z-30 bg-slate-50 px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
                Chức&nbsp;năng
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-red-500">
                  Lỗi tải dữ liệu.{' '}
                  <button className="underline" onClick={() => refetch()}>
                    Thử lại
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-400">
                  Chưa có khách hàng nào.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const hasDebt = Number(r.receivable) > 0
              // Lập CT từ danh mục KH: điền sẵn khách hàng vào chứng từ bán hàng mới.
              const createVoucher = () => {
                const q = new URLSearchParams({ customer: r.code, customerName: r.name })
                if (r.address) q.set('customerAddress', r.address)
                navigate(`/sales/vouchers/new?${q.toString()}`)
              }
              // Thu tiền: mở phiếu thu tiền mặt, loại "Thu tiền khách hàng" (Có 131), điền sẵn KH.
              const collectDebt = () =>
                navigate(
                  `/cash/vouchers/new?type=${CashVoucherType.Receipt}&category=${CashVoucherCategory.ReceiptCustomer}` +
                    `&partnerId=${r.id}&partnerName=${encodeURIComponent(r.name)}`,
                )
              return (
              <tr key={r.id} className="group border-t border-border hover:bg-slate-50">
                <td className="px-3 py-2">
                  <button
                    className="text-primary hover:underline"
                    onClick={() => setForm({ customerId: r.id, readOnly: true })}
                  >
                    {r.code}
                  </button>
                </td>
                <td className="max-w-[220px] px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'min-w-0 truncate',
                        r.isActive ? 'text-slate-700' : 'text-slate-400',
                      )}
                      title={r.name}
                    >
                      {r.name}
                    </span>
                    {!r.isActive && (
                      <span className="shrink-0 whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                        Ngừng sử dụng
                      </span>
                    )}
                  </div>
                </td>
                <td
                  className="max-w-[260px] truncate px-3 py-2 text-slate-600"
                  title={r.address || ''}
                >
                  {r.address}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-800">
                  {formatCurrency(Number(r.receivable))}
                </td>
                <td className="px-3 py-2 text-slate-600">{r.taxCode}</td>
                <td className="px-3 py-2 text-slate-600">{r.phone}</td>
                <td className="sticky right-0 z-10 bg-white px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50">
                  {/* Còn công nợ → nút chính "Thu tiền" + thêm Lập CT bán hàng, nhắc nợ vào menu. */}
                  <RowActionMenu
                    primaryLabel={hasDebt ? 'Thu tiền' : 'Lập CT bán hàng'}
                    onPrimary={hasDebt ? collectDebt : createVoucher}
                    items={[
                      ...(hasDebt ? [{ label: 'Lập CT bán hàng', onClick: createVoucher }] : []),
                      { label: 'Sửa', onClick: () => setForm({ customerId: r.id }) },
                      {
                        label: 'Xem',
                        onClick: () => setForm({ customerId: r.id, readOnly: true }),
                      },
                      {
                        label: 'Nhân bản',
                        onClick: () => setForm({ duplicateFromId: r.id }),
                      },
                      ...(hasDebt
                        ? [
                            {
                              label: r.debtReminderOn
                                ? 'Tắt nhắc nợ tự động'
                                : 'Bật nhắc nợ tự động',
                              onClick: () =>
                                upd.mutate({
                                  id: r.id,
                                  dto: { debtReminderOn: !r.debtReminderOn },
                                }),
                            },
                          ]
                        : []),
                      {
                        label: 'Xóa',
                        danger: true,
                        onClick: async () => {
                          const ok = await confirm({
                            title: `Xóa khách hàng ${r.code}?`,
                            description: 'Hành động này không thể hoàn tác.',
                            confirmText: 'Xóa',
                            destructive: true,
                          })
                          if (ok) del.mutate(r.id)
                        },
                      },
                      {
                        label: r.isActive ? 'Ngừng sử dụng' : 'Sử dụng',
                        onClick: () => upd.mutate({ id: r.id, dto: { isActive: !r.isActive } }),
                      },
                    ]}
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
            onClick={() => setParam('cpage', String(page - 1))}
          >
            Trước
          </button>
          <span className="px-2 py-1 text-slate-700">
            {page} / {pageCount}
          </span>
          <button
            className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
            disabled={page >= pageCount}
            onClick={() => setParam('cpage', String(page + 1))}
          >
            Sau
          </button>
        </div>
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        size="lg"
        title={
          form?.readOnly
            ? 'Xem khách hàng'
            : form?.customerId
              ? 'Sửa khách hàng'
              : form?.duplicateFromId
                ? 'Nhân bản khách hàng'
                : 'Thông tin khách hàng'
        }
      >
        {form && (
          <CustomerForm
            key={form.customerId ?? form.duplicateFromId ?? 'new'}
            customerId={form.customerId ?? null}
            duplicateFromId={form.duplicateFromId ?? null}
            readOnly={form.readOnly}
            onSaved={() => setForm(null)}
            onCancel={() => setForm(null)}
          />
        )}
      </Modal>
    </div>
  )
}
