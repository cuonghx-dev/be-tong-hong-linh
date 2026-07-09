import type { FixedAssetFilter } from '@app/shared'
import { useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { formatCurrency } from '@/shared/lib/currency'
import { AddMenu } from '@/shared/ui/add-menu'
import { useConfirm } from '@/shared/ui/confirm-dialog'
import { RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { RowActionMenu } from '@/shared/ui/row-action-menu'
import { useToast } from '@/shared/ui/toast'
import { useFixedAssets } from '../api/useFixedAssets'
import { useDeleteFixedAsset, useImportFixedAssets } from '../api/useFixedAssetMutations'
import {
  FixedAssetFilterPopover,
  type FixedAssetFilterValue,
} from './FixedAssetFilterPopover'

const PAGE_SIZE = 20
const COLSPAN = 16

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

function money(v: string | number): string {
  return formatCurrency(Number(v))
}

// Danh sách ghi tăng TSCD — cùng thực thể thẻ tài sản, sắp theo ngày ghi tăng giảm dần,
// kèm cột "Số chứng từ" (GTTS##/YYYY). Là nơi tạo mới thẻ tài sản (§06-tscd).
export function AssetIncreaseTable() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const del = useDeleteFixedAsset()
  const importXlsx = useImportFixedAssets()
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const confirm = useConfirm()

  const openNew = () => navigate('/fixed-asset/increases/new')
  const openView = (id: string) => navigate(`/fixed-asset/increases/${id}`)
  const openEdit = (id: string) => navigate(`/fixed-asset/increases/${id}/edit`)

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // cho phép chọn lại cùng file
    if (!file) return
    importXlsx.mutate(file, {
      onSuccess: (r) =>
        toast({
          variant: 'success',
          title: 'Nhập khẩu thành công',
          description: `${r.created} tài sản mới, bỏ qua ${r.skipped} trùng (tổng ${r.total}).`,
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
  const assetType = params.get('assetType') ?? ''
  const status = params.get('status') ?? ''
  const fromDate = params.get('from') ?? ''
  const toDate = params.get('to') ?? ''

  const filter: FixedAssetFilter = {
    page,
    pageSize: PAGE_SIZE,
    orderBy: 'increaseDate',
    keyword: keyword || undefined,
    assetType: assetType || undefined,
    status: (status || undefined) as FixedAssetFilter['status'],
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  }
  const { data, isLoading, isError, refetch, isFetching } = useFixedAssets(filter)

  const rows = data?.data ?? []
  const totals = data?.totals
  const total = data?.pagination.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setParams(next)
  }

  const applyFilter = (v: FixedAssetFilterValue) => {
    const next = new URLSearchParams(params)
    for (const [k, val] of Object.entries({
      assetType: v.assetType,
      status: v.status,
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
    ;['assetType', 'status', 'from', 'to'].forEach((k) => next.delete(k))
    next.set('page', '1')
    setParams(next)
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <FixedAssetFilterPopover
          value={{ assetType, status, from: fromDate, to: toDate }}
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
            actions={[{ label: 'Ghi tăng tài sản', onClick: openNew }]}
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
        <table className="w-full min-w-[1800px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-12 px-3 py-2 text-center">STT</th>
              <th className="px-3 py-2">Số chứng từ</th>
              <th className="px-3 py-2">Ngày ghi tăng</th>
              <th className="px-3 py-2">Mã tài sản</th>
              <th className="px-3 py-2">Tên tài sản</th>
              <th className="px-3 py-2">Đơn vị sử dụng</th>
              <th className="px-3 py-2 text-right">Nguyên giá</th>
              <th className="px-3 py-2 text-right">Giá trị tính KH</th>
              <th className="px-3 py-2 text-right">Hao mòn lũy kế</th>
              <th className="px-3 py-2 text-right">Giá trị còn lại</th>
              <th className="px-3 py-2 text-right">TG sử dụng (tháng)</th>
              <th className="px-3 py-2 text-right">Giá trị KH tháng</th>
              <th className="px-3 py-2">TK nguyên giá</th>
              <th className="px-3 py-2">TK khấu hao</th>
              <th className="px-3 py-2">Ngày bắt đầu tính KH</th>
              <th className="sticky right-0 z-20 bg-slate-50 px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
                Chức năng
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={COLSPAN} className="px-3 py-10 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={COLSPAN} className="px-3 py-10 text-center text-red-500">
                  Lỗi tải dữ liệu.{' '}
                  <button className="underline" onClick={() => refetch()}>
                    Thử lại
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={COLSPAN} className="px-3 py-10 text-center text-slate-400">
                  Chưa có chứng từ ghi tăng nào.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.id} className="group border-t border-border hover:bg-slate-50">
                <td className="px-3 py-2 text-center text-slate-500">
                  {(page - 1) * PAGE_SIZE + i + 1}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <button className="text-primary hover:underline" onClick={() => openView(r.id)}>
                    {r.voucherNo}
                  </button>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                  {formatDate(r.increaseDate)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700">{r.code}</td>
                <td className="max-w-[260px] truncate px-3 py-2 text-slate-700">{r.name}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.department}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-700">
                  {money(r.originalCost)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-700">
                  {money(r.depreciableValue)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-700">
                  {money(r.accumulatedDepreciation)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-700">
                  {money(r.residualValue)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                  {r.usefulLifeMonths}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-700">
                  {money(r.monthlyDepreciation)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.costAccount}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                  {r.depreciationAccount}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                  {formatDate(r.depreciationStartDate)}
                </td>
                <td className="sticky right-0 z-10 bg-white px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50">
                  <RowActionMenu
                    onPrimary={() => openView(r.id)}
                    items={[
                      { label: 'Sửa', onClick: () => openEdit(r.id) },
                      {
                        label: 'Xóa',
                        danger: true,
                        onClick: async () => {
                          const ok = await confirm({
                            title: `Xóa chứng từ ${r.voucherNo ?? r.code}?`,
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
          {!isLoading && !isError && rows.length > 0 && totals && (
            <tfoot className="sticky bottom-0 z-10 bg-slate-100 font-semibold text-slate-700">
              <tr className="border-t-2 border-border">
                <td className="px-3 py-2 text-center" colSpan={6}>
                  Tổng
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{money(totals.originalCost)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {money(totals.depreciableValue)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {money(totals.accumulatedDepreciation)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{money(totals.residualValue)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{totals.usefulLifeMonths}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {money(totals.monthlyDepreciation)}
                </td>
                <td className="px-3 py-2" colSpan={3} />
                <td className="sticky right-0 z-10 bg-slate-100 px-3 py-2" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Footer / phân trang */}
      <div className="flex items-center border-t border-border px-3 py-2 text-sm text-slate-500">
        <span>
          Tổng số: <b className="text-slate-700">{total}</b> chứng từ
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
