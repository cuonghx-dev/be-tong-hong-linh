import { GoodsIssueCategory, type GoodsIssueFilter } from '@app/shared'
import { useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { AddMenu } from '@/shared/ui/add-menu'
import { RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { useConfirm } from '@/shared/ui/confirm-dialog'
import { RowActionMenu } from '@/shared/ui/row-action-menu'
import { useToast } from '@/shared/ui/toast'
import { useGoodsIssues } from '../api/useGoodsIssues'
import {
  useDeleteGoodsIssue,
  useImportGoodsIssues,
  useSetGoodsIssuePosted,
} from '../api/useGoodsIssueMutations'
import { GOODS_ISSUE_CATEGORY_LABEL } from '../types'
import {
  GoodsIssueFilterPopover,
  type GoodsIssueFilterValue,
} from './GoodsIssueFilterPopover'

const PAGE_SIZE = 20

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

export function GoodsIssueTable() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const del = useDeleteGoodsIssue()
  const setPosted = useSetGoodsIssuePosted()
  const importXlsx = useImportGoodsIssues()
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const confirm = useConfirm()

  // Điều hướng sang trang chứng từ full-page (§5).
  const openNew = (category: GoodsIssueCategory) =>
    navigate(`/inventory/issues/new?category=${category}`)
  const openView = (id: string) => navigate(`/inventory/issues/${id}`)
  const openEdit = (id: string) => navigate(`/inventory/issues/${id}/edit`)
  // Nhân bản: mở form tạo mới, điền sẵn dữ liệu phiếu nguồn (số phiếu cấp lại khi Lưu).
  const openDuplicate = (id: string) => navigate(`/inventory/issues/new?duplicateFrom=${id}`)

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // cho phép chọn lại cùng file
    if (!file) return
    importXlsx.mutate(file, {
      onSuccess: (r) =>
        toast({
          variant: 'success',
          title: 'Nhập khẩu thành công',
          description: `${r.created} phiếu mới, bỏ qua ${r.skipped} trùng (tổng ${r.total}).`,
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
  const category = params.get('category') ?? ''
  const fromDate = params.get('from') ?? ''
  const toDate = params.get('to') ?? ''

  const filter: GoodsIssueFilter = {
    page,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
    category: (category || undefined) as GoodsIssueFilter['category'],
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  }
  const { data, isLoading, isError, refetch, isFetching } = useGoodsIssues(filter)

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

  const applyFilter = (v: GoodsIssueFilterValue) => {
    const next = new URLSearchParams(params)
    for (const [k, val] of Object.entries({ category: v.category, from: v.from, to: v.to })) {
      if (val) next.set(k, val)
      else next.delete(k)
    }
    next.set('page', '1')
    setParams(next)
  }

  const resetFilter = () => {
    const next = new URLSearchParams(params)
    ;['category', 'from', 'to'].forEach((k) => next.delete(k))
    next.set('page', '1')
    setParams(next)
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <GoodsIssueFilterPopover
          value={{ category, from: fromDate, to: toDate }}
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
              { label: 'Phiếu xuất kho', onClick: () => openNew(GoodsIssueCategory.Sales) },
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
              <th className="px-3 py-2">Ngày hạch&nbsp;toán</th>
              <th className="px-3 py-2">Số chứng&nbsp;từ</th>
              <th className="px-3 py-2">Diễn&nbsp;giải</th>
              <th className="px-3 py-2 text-right">Tổng&nbsp;tiền</th>
              <th className="px-3 py-2">Người&nbsp;nhận</th>
              <th className="px-3 py-2">Đã lập CT bán&nbsp;hàng</th>
              <th className="px-3 py-2">TT phát&nbsp;hành hóa&nbsp;đơn</th>
              <th className="px-3 py-2">Mã CQT cấp</th>
              <th className="px-3 py-2">Loại chứng&nbsp;từ</th>
              <th className="sticky right-0 z-30 bg-slate-50 px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
                Chức&nbsp;năng
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
                  Chưa có phiếu xuất kho nào.
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
                <td className="whitespace-nowrap px-3 py-2">
                  <button className="text-primary hover:underline" onClick={() => openView(r.id)}>
                    {r.voucherNo}
                  </button>
                  {!r.posted && (
                    <span className="mt-0.5 block w-fit rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                      Chưa ghi sổ
                    </span>
                  )}
                </td>
                <td
                  className="min-w-[220px] max-w-[340px] px-3 py-2 text-slate-700"
                  title={r.description || ''}
                >
                  <div className="line-clamp-2 break-words">{r.description}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-700">
                  {formatCurrency(Number(r.totalAmount))}
                </td>
                <td
                  className="min-w-[140px] max-w-[220px] px-3 py-2 text-slate-600"
                  title={r.receiver || ''}
                >
                  <div className="line-clamp-2 break-words">{r.receiver}</div>
                </td>
                <td className="px-3 py-2 text-slate-600">{r.salesDocStatus}</td>
                <td className="px-3 py-2 text-slate-600">{r.invoiceIssueStatus}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.taxAuthorityCode}</td>
                <td className="min-w-[160px] px-3 py-2 text-slate-600">
                  {GOODS_ISSUE_CATEGORY_LABEL[r.category]}
                </td>
                <td className="sticky right-0 z-10 bg-white px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50">
                  <RowActionMenu
                    onPrimary={() => openView(r.id)}
                    items={[
                      { label: 'Sửa', onClick: () => openEdit(r.id) },
                      {
                        label: r.posted ? 'Bỏ ghi' : 'Ghi sổ',
                        action: 'post',
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
                        label: 'Xóa',
                        danger: true,
                        onClick: async () => {
                          const ok = await confirm({
                            title: `Xóa phiếu ${r.voucherNo}?`,
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
