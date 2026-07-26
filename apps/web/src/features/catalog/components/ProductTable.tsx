import type { ProductFilter } from '@app/shared'
import { PRODUCT_TYPE_LABELS, ProductType } from '@app/shared'
import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatCurrency } from '@/shared/lib/currency'
import { AddMenu } from '@/shared/ui/add-menu'
import { useConfirm } from '@/shared/ui/confirm-dialog'
import { RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { Modal } from '@/shared/ui/modal'
import { RowActionMenu } from '@/shared/ui/row-action-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useToast } from '@/shared/ui/toast'
import { useProducts } from '../api/useProducts'
import {
  useDeleteProduct,
  useImportProducts,
  useUpdateProduct,
} from '../api/useProductMutations'
import { ProductForm } from './ProductForm'

const PAGE_SIZE = 20

// Query params riêng cho bảng hàng hóa (tránh đụng param bảng khác cùng trang).
const P = { page: 'sp_page', q: 'sp_q', type: 'sp_type' }

// Hiển thị giá trị tiền Decimal-string; rỗng/0 → gạch ngang.
function money(v: string | null | undefined) {
  const n = v ? Number(v) : 0
  return n ? formatCurrency(n) : '—'
}

// Số lượng tồn: giữ tới 4 chữ số thập phân (khớp Decimal(18,4) của dòng chứng từ kho).
function qty(v: string | null | undefined) {
  const n = v ? Number(v) : 0
  return n ? n.toLocaleString('vi-VN', { maximumFractionDigits: 4 }) : '—'
}

export function ProductTable() {
  const [params, setParams] = useSearchParams()
  const [formState, setFormState] = useState<{
    productId?: string
    duplicateFromId?: string
    readOnly?: boolean
  } | null>(null)
  const del = useDeleteProduct()
  const upd = useUpdateProduct()
  const importXlsx = useImportProducts()
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const confirm = useConfirm()

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // cho phép chọn lại cùng file
    if (!file) return
    importXlsx.mutate(file, {
      onSuccess: (r) =>
        toast({
          variant: 'success',
          title: 'Nhập khẩu thành công',
          description: `${r.created} hàng hóa mới, bỏ qua ${r.skipped} trùng (tổng ${r.total}).`,
        }),
      onError: () =>
        toast({
          variant: 'error',
          title: 'Nhập khẩu thất bại',
          description: 'Kiểm tra lại file Excel.',
        }),
    })
  }

  const page = Number(params.get(P.page) ?? 1)
  const keyword = params.get(P.q) ?? ''
  const type = (params.get(P.type) as ProductType | null) ?? undefined

  const filter: ProductFilter = {
    page,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
    type,
  }
  const { data, isLoading, isError, refetch, isFetching } = useProducts(filter)

  const rows = data?.data ?? []
  const total = data?.pagination.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== P.page) next.set(P.page, '1')
    setParams(next)
  }

  const closeForm = () => setFormState(null)

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={onPickFile}
        />

        <Select
          value={type ?? 'all'}
          onValueChange={(v) => setParam(P.type, v === 'all' ? null : v)}
        >
          <SelectTrigger className="h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả tính chất</SelectItem>
            {Object.values(ProductType).map((t) => (
              <SelectItem key={t} value={t}>
                {PRODUCT_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <AddMenu
            actions={[{ label: 'Hàng hóa, dịch vụ', onClick: () => setFormState({}) }]}
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
                if (e.key === 'Enter') setParam(P.q, (e.target as HTMLInputElement).value || null)
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
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-10 px-3 py-2 text-center">
                <input type="checkbox" />
              </th>
              <th className="px-3 py-2">Tên</th>
              <th className="px-3 py-2">Mã</th>
              <th className="px-3 py-2">Giảm&nbsp;thuế theo&nbsp;quy&nbsp;định</th>
              <th className="px-3 py-2">Tính&nbsp;chất</th>
              <th className="px-3 py-2 text-right">Số&nbsp;lượng tồn</th>
              <th className="px-3 py-2 text-right">Giá&nbsp;trị tồn</th>
              <th className="sticky right-0 z-30 bg-slate-50 px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
                Chức&nbsp;năng
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
                  Chưa có hàng hóa nào.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="group border-t border-border hover:bg-slate-50">
                <td className="px-3 py-2 text-center">
                  <input type="checkbox" />
                </td>
                <td className="max-w-[320px] px-3 py-2">
                  <button
                    className="block max-w-full truncate text-left text-primary hover:underline"
                    onClick={() => setFormState({ productId: r.id, readOnly: true })}
                    title={r.name}
                  >
                    {r.name}
                  </button>
                  {!r.isActive && (
                    <span className="text-xs text-slate-400">Ngừng sử dụng</span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600">{r.code}</td>
                <td className="px-3 py-2 text-slate-600">{r.taxReduction ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600">{PRODUCT_TYPE_LABELS[r.type]}</td>
                <td className="px-3 py-2 text-right text-slate-600">{qty(r.stockQty)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{money(r.stockAmount)}</td>
                <td className="sticky right-0 z-10 bg-white px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50">
                  {/* Thao tác chính: Sửa; menu ▾: Xóa, Nhân bản, Ngừng/Sử dụng lại. */}
                  <RowActionMenu
                    primaryLabel="Sửa"
                    onPrimary={() => setFormState({ productId: r.id })}
                    items={[
                      {
                        label: 'Sửa',
                        onClick: () => setFormState({ productId: r.id }),
                      },
                      {
                        label: 'Xóa',
                        danger: true,
                        onClick: async () => {
                          const ok = await confirm({
                            title: `Xóa hàng hóa ${r.code}?`,
                            description: 'Hành động này không thể hoàn tác.',
                            confirmText: 'Xóa',
                            destructive: true,
                          })
                          if (ok) del.mutate(r.id)
                        },
                      },
                      {
                        label: 'Nhân bản',
                        onClick: () => setFormState({ duplicateFromId: r.id }),
                      },
                      {
                        label: r.isActive ? 'Ngừng sử dụng' : 'Sử dụng lại',
                        onClick: () => upd.mutate({ id: r.id, dto: { isActive: !r.isActive } }),
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
              onClick={() => setParam(P.page, String(page - 1))}
            >
              Trước
            </button>
            <span className="px-2 py-1 text-slate-700">
              {page} / {pageCount}
            </span>
            <button
              className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
              disabled={page >= pageCount}
              onClick={() => setParam(P.page, String(page + 1))}
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
        size="lg"
        title={
          formState?.readOnly
            ? 'Xem hàng hóa'
            : formState?.productId
              ? 'Sửa hàng hóa'
              : formState?.duplicateFromId
                ? 'Nhân bản hàng hóa'
                : 'Thông tin hàng hóa, dịch vụ'
        }
      >
        {formState && (
          <ProductForm
            key={formState.productId ?? formState.duplicateFromId ?? 'new'}
            productId={formState.productId ?? null}
            duplicateFromId={formState.duplicateFromId ?? null}
            readOnly={formState.readOnly}
            onSaved={closeForm}
            onCancel={closeForm}
          />
        )}
      </Modal>
    </div>
  )
}
