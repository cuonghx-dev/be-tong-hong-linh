import { ItemNature, type InventoryItemFilter } from '@app/shared'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatCurrency } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import { useConfirm } from '@/shared/ui/confirm-dialog'
import { PlusIcon, RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { Modal } from '@/shared/ui/modal'
import { RowActionMenu } from '@/shared/ui/row-action-menu'
import { useItems } from '../api/useItems'
import { useDeleteItem } from '../api/useItemMutations'
import { ITEM_NATURE_LABEL, ITEM_TAX_REDUCTION_LABEL } from '../types'
import { ItemForm } from './ItemForm'

const PAGE_SIZE = 20

// Query params riêng cho tab HHDV.
const P = { page: 'it_page', q: 'it_q', nature: 'it_nature', oos: 'it_oos' }

const qtyFmt = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function ItemTable() {
  const [params, setParams] = useSearchParams()
  const [formState, setFormState] = useState<{ itemId?: string; readOnly?: boolean } | null>(null)
  const del = useDeleteItem()
  const confirm = useConfirm()

  const page = Number(params.get(P.page) ?? 1)
  const keyword = params.get(P.q) ?? ''
  const nature = (params.get(P.nature) as ItemNature | null) ?? undefined
  const outOfStock = params.get(P.oos) === '1'

  const filter: InventoryItemFilter = {
    page,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
    nature,
    outOfStock: outOfStock || undefined,
  }
  const { data, isLoading, isError, refetch, isFetching } = useItems(filter)

  const rows = data?.data ?? []
  const total = data?.pagination.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const sumQty = rows.reduce((s, r) => s + Number(r.stockQuantity), 0)
  const sumValue = rows.reduce((s, r) => s + Number(r.stockValue), 0)

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
        <select
          value={nature ?? ''}
          onChange={(e) => setParam(P.nature, e.target.value || null)}
          className="h-8 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Tất cả tính chất</option>
          {Object.values(ItemNature).map((n) => (
            <option key={n} value={n}>
              {ITEM_NATURE_LABEL[n]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={outOfStock}
            onChange={(e) => setParam(P.oos, e.target.checked ? '1' : null)}
          />
          Hết hàng
        </label>

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => setFormState({})}>
            <PlusIcon size={16} /> Thêm
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
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-10 px-3 py-2 text-center">
                <input type="checkbox" />
              </th>
              <th className="px-3 py-2">Tên</th>
              <th className="px-3 py-2">Mã</th>
              <th className="px-3 py-2">Giảm thuế theo quy định</th>
              <th className="px-3 py-2">Tính chất</th>
              <th className="px-3 py-2 text-right">Số lượng tồn</th>
              <th className="px-3 py-2 text-right">Giá trị tồn</th>
              <th className="px-3 py-2">Chi nhánh</th>
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
                  Chưa có hàng hóa - dịch vụ nào.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="group border-t border-border hover:bg-slate-50">
                <td className="px-3 py-2 text-center">
                  <input type="checkbox" />
                </td>
                <td className="max-w-[260px] truncate px-3 py-2 text-slate-700">{r.name}</td>
                <td className="px-3 py-2">
                  <button
                    className="text-primary hover:underline"
                    onClick={() => setFormState({ itemId: r.id, readOnly: true })}
                  >
                    {r.code}
                  </button>
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {ITEM_TAX_REDUCTION_LABEL[r.taxReduction]}
                </td>
                <td className="px-3 py-2 text-slate-600">{ITEM_NATURE_LABEL[r.nature]}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-600">
                  {qtyFmt.format(Number(r.stockQuantity))}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-600">
                  {formatCurrency(Number(r.stockValue))}
                </td>
                <td className="max-w-[200px] truncate px-3 py-2 text-slate-600">{r.branchName}</td>
                <td className="sticky right-0 z-10 bg-white px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50">
                  <RowActionMenu
                    primaryLabel="Sửa"
                    onPrimary={() => setFormState({ itemId: r.id, readOnly: true })}
                    items={[
                      {
                        label: 'Sửa',
                        onClick: () => setFormState({ itemId: r.id }),
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
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="sticky bottom-0 bg-slate-50 font-medium text-slate-700">
              <tr className="border-t border-border">
                <td className="px-3 py-2" colSpan={5}>
                  Tổng
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {qtyFmt.format(sumQty)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {formatCurrency(sumValue)}
                </td>
                <td className="px-3 py-2" />
                <td className="sticky right-0 bg-slate-50 px-3 py-2" />
              </tr>
            </tfoot>
          )}
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
            ? 'Xem hàng hóa - dịch vụ'
            : formState?.itemId
              ? 'Sửa hàng hóa - dịch vụ'
              : 'Thông tin hàng hóa - dịch vụ'
        }
      >
        {formState && (
          <ItemForm
            key={formState.itemId ?? 'new'}
            itemId={formState.itemId ?? null}
            readOnly={formState.readOnly}
            onSaved={closeForm}
            onCancel={closeForm}
          />
        )}
      </Modal>
    </div>
  )
}
