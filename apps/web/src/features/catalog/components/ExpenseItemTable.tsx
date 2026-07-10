import type { ExpenseItemDto, ExpenseItemFilter } from '@app/shared'
import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { AddMenu } from '@/shared/ui/add-menu'
import { useConfirm } from '@/shared/ui/confirm-dialog'
import { MinusSquareIcon, PlusSquareIcon, RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { Modal } from '@/shared/ui/modal'
import { RowActionMenu } from '@/shared/ui/row-action-menu'
import { useToast } from '@/shared/ui/toast'
import { useExpenseItems } from '../api/useExpenseItems'
import { useDeleteExpenseItem, useImportExpenseItems } from '../api/useExpenseItemMutations'
import { ExpenseItemForm } from './ExpenseItemForm'

// Danh mục nhỏ → lấy cả bảng 1 lần để dựng cây (max của API).
const PAGE_SIZE = 200

// Query param riêng cho bảng khoản mục chi phí (tránh đụng param bảng khác cùng trang).
const P = { q: 'kmcp_q' }

interface TreeRow {
  item: ExpenseItemDto
  depth: number
  hasChildren: boolean
}

// Dựng cây từ parentId rồi trải phẳng theo thứ tự duyệt sâu, bỏ nhánh đã thu gọn.
// Con mất cha (cha bị lọc/xóa) coi như khoản mục gốc.
function flattenTree(items: ExpenseItemDto[], collapsed: Set<string>): TreeRow[] {
  const byId = new Set(items.map((i) => i.id))
  const children = new Map<string | null, ExpenseItemDto[]>()
  for (const i of items) {
    const key = i.parentId && byId.has(i.parentId) ? i.parentId : null
    children.set(key, [...(children.get(key) ?? []), i])
  }

  const out: TreeRow[] = []
  const walk = (parentId: string | null, depth: number) => {
    for (const item of children.get(parentId) ?? []) {
      const hasChildren = (children.get(item.id) ?? []).length > 0
      out.push({ item, depth, hasChildren })
      if (hasChildren && !collapsed.has(item.id)) walk(item.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}

export function ExpenseItemTable() {
  const [params, setParams] = useSearchParams()
  const [formState, setFormState] = useState<{ itemId?: string; readOnly?: boolean } | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const del = useDeleteExpenseItem()
  const importXlsx = useImportExpenseItems()
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
          description: `${r.created} khoản mục mới, bỏ qua ${r.skipped} trùng (tổng ${r.total}).`,
        }),
      onError: () =>
        toast({
          variant: 'error',
          title: 'Nhập khẩu thất bại',
          description: 'Kiểm tra lại file Excel.',
        }),
    })
  }

  const keyword = params.get(P.q) ?? ''

  const filter: ExpenseItemFilter = {
    page: 1,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
  }
  const { data, isLoading, isError, refetch, isFetching } = useExpenseItems(filter)

  const items = data?.data ?? []
  const total = data?.pagination.total ?? 0

  // Có từ khóa tìm kiếm → hiện phẳng (kết quả có thể thiếu cha nên không dựng cây).
  const treeMode = !keyword
  const rows = useMemo<TreeRow[]>(
    () =>
      treeMode
        ? flattenTree(items, collapsed)
        : items.map((item) => ({ item, depth: 0, hasChildren: false })),
    [items, collapsed, treeMode],
  )

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const setKeyword = (value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(P.q, value)
    else next.delete(P.q)
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

        <div className="ml-auto flex items-center gap-2">
          <AddMenu
            actions={[{ label: 'Khoản mục chi phí', onClick: () => setFormState({}) }]}
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
                if (e.key === 'Enter') setKeyword((e.target as HTMLInputElement).value || null)
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
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Mã khoản mục chi phí</th>
              <th className="px-3 py-2">Tên khoản mục chi phí</th>
              <th className="px-3 py-2">Diễn giải</th>
              <th className="px-3 py-2">Trạng thái</th>
              <th className="sticky right-0 z-20 bg-slate-50 px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
                Chức năng
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-red-500">
                  Lỗi tải dữ liệu.{' '}
                  <button className="underline" onClick={() => refetch()}>
                    Thử lại
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-slate-400">
                  Chưa có khoản mục chi phí nào.
                </td>
              </tr>
            )}
            {rows.map(({ item: r, depth, hasChildren }) => (
              <tr key={r.id} className="group border-t border-border hover:bg-slate-50">
                <td className="px-3 py-2">
                  <div
                    className="flex items-center gap-1"
                    style={{ paddingLeft: `${depth * 20}px` }}
                  >
                    {hasChildren ? (
                      <button
                        onClick={() => toggle(r.id)}
                        className="grid h-4 w-4 shrink-0 place-items-center text-slate-400 hover:text-slate-600"
                        aria-label={collapsed.has(r.id) ? 'Mở rộng' : 'Thu gọn'}
                      >
                        {collapsed.has(r.id) ? (
                          <PlusSquareIcon size={14} />
                        ) : (
                          <MinusSquareIcon size={14} />
                        )}
                      </button>
                    ) : (
                      <span className="h-4 w-4 shrink-0" />
                    )}
                    <button
                      className={cn('text-primary hover:underline', hasChildren && 'font-semibold')}
                      onClick={() => setFormState({ itemId: r.id, readOnly: true })}
                    >
                      {r.code}
                    </button>
                  </div>
                </td>
                <td
                  className={cn(
                    'max-w-[320px] truncate px-3 py-2 text-slate-700',
                    hasChildren && 'font-semibold',
                  )}
                >
                  {r.name}
                </td>
                <td className="max-w-[280px] truncate px-3 py-2 text-slate-600">{r.description}</td>
                <td className={cn('px-3 py-2', hasChildren && 'font-semibold')}>
                  <span
                    className={cn(
                      'inline-block rounded-full px-2 py-0.5 text-xs',
                      r.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {r.isActive ? 'Đang sử dụng' : 'Ngừng sử dụng'}
                  </span>
                </td>
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
                            title: `Xóa khoản mục chi phí ${r.code}?`,
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
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center border-t border-border px-3 py-2 text-sm text-slate-500">
        <span>
          Tổng số: <b className="text-slate-700">{total}</b> bản ghi
        </span>
      </div>

      {/* Form modal */}
      <Modal
        open={!!formState}
        onClose={closeForm}
        size="lg"
        title={
          formState?.readOnly
            ? 'Xem khoản mục chi phí'
            : formState?.itemId
              ? 'Sửa khoản mục chi phí'
              : 'Thông tin khoản mục chi phí'
        }
      >
        {formState && (
          <ExpenseItemForm
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
