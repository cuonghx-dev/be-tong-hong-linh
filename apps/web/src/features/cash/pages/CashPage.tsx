import { CashVoucherCategory, CashVoucherType, type CashVoucherFilter } from '@app/shared'
import { useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { formatCurrency } from '@/shared/lib/currency'
import { cn } from '@/shared/lib/cn'
import { AddMenu } from '@/shared/ui/add-menu'
import { useConfirm } from '@/shared/ui/confirm-dialog'
import { RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { RowActionMenu } from '@/shared/ui/row-action-menu'
import { useToast } from '@/shared/ui/toast'
import { useCashVouchers } from '../api/useCashVouchers'
import { useDeleteCashVoucher, useImportCashVouchers } from '../api/useCashVoucherMutations'
import { CashFilterPopover, type CashFilterValue } from '../components/CashFilterPopover'
import { CashProcessTab } from '../components/CashProcessTab'
import { CashReportListTab } from '../components/reports/CashReportListTab'
import { CATEGORY_LABEL } from '../types'

const PAGE_SIZE = 20

function CashTable() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const del = useDeleteCashVoucher()
  const importXlsx = useImportCashVouchers()
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const confirm = useConfirm()

  // Điều hướng sang trang chứng từ full-page (§5).
  const openNew = (type: CashVoucherType) => navigate(`/cash/vouchers/new?type=${type}`)
  const openView = (id: string, type: CashVoucherType) =>
    navigate(`/cash/vouchers/${id}?type=${type}`)
  const openEdit = (id: string, type: CashVoucherType) =>
    navigate(`/cash/vouchers/${id}/edit?type=${type}`)

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
  const typeParam = (params.get('type') as CashVoucherType | null) ?? null
  const categoryParam = (params.get('category') as CashVoucherCategory | null) ?? null
  const fromDate = params.get('from') ?? ''
  const toDate = params.get('to') ?? ''

  const filter: CashVoucherFilter = {
    page,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
    type: typeParam ?? undefined,
    category: categoryParam ?? undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  }
  const { data, isLoading, isError, refetch, isFetching } = useCashVouchers(filter)

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

  // Áp dụng nhiều tiêu chí lọc cùng lúc (từ popover) → URL params.
  const applyFilter = (v: CashFilterValue) => {
    const next = new URLSearchParams(params)
    for (const [k, val] of Object.entries({
      type: v.type,
      category: v.category,
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
    ;['type', 'category', 'from', 'to'].forEach((k) => next.delete(k))
    next.set('page', '1')
    setParams(next)
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <CashFilterPopover
          value={{ type: typeParam ?? '', category: categoryParam ?? '', from: fromDate, to: toDate }}
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
              { label: 'Thu tiền', onClick: () => openNew(CashVoucherType.Receipt) },
              { label: 'Chi tiền', onClick: () => openNew(CashVoucherType.Payment) },
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
        <table className="w-full min-w-[1040px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-10 px-3 py-2 text-center">
                <input type="checkbox" />
              </th>
              <th className="px-3 py-2">Ngày hạch toán</th>
              <th className="px-3 py-2">Số chứng từ</th>
              <th className="px-3 py-2">Diễn giải</th>
              <th className="px-3 py-2 text-right">Số tiền</th>
              <th className="px-3 py-2">Đối tượng</th>
              <th className="px-3 py-2">Lý do thu/chi</th>
              <th className="px-3 py-2">Loại chứng từ</th>
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
                  Chưa có phiếu thu/chi nào.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const signed = r.type === CashVoucherType.Payment ? -Number(r.totalAmount) : Number(r.totalAmount)
              return (
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
                  </td>
                  <td
                    className="max-w-[220px] truncate px-3 py-2 text-slate-700"
                    title={r.lines[0]?.description || r.reason || ''}
                  >
                    {r.lines[0]?.description || r.reason}
                  </td>
                  <td
                    className={cn(
                      'whitespace-nowrap px-3 py-2 text-right tabular-nums',
                      signed < 0 ? 'text-red-600' : 'text-emerald-600',
                    )}
                  >
                    {formatCurrency(signed)}
                  </td>
                  <td
                    className="max-w-[160px] truncate px-3 py-2 text-slate-600"
                    title={r.partnerName || ''}
                  >
                    {r.partnerName}
                  </td>
                  <td
                    className="max-w-[200px] truncate px-3 py-2 text-slate-600"
                    title={r.reason || ''}
                  >
                    {r.reason}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{CATEGORY_LABEL[r.category]}</td>
                  <td className="sticky right-0 z-10 bg-white px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50">
                    <RowActionMenu
                      onPrimary={() => openView(r.id, r.type)}
                      items={[
                        {
                          label: 'Sửa',
                          onClick: () => openEdit(r.id, r.type),
                        },
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
                            if (ok) del.mutate(r.id)
                          },
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

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

const TABS: ModuleTab[] = [
  { key: 'process', label: 'Quy trình', render: () => <CashProcessTab /> },
  { key: 'txn', label: 'Thu, chi tiền', render: () => <CashTable /> },
  { key: 'report', label: 'Báo cáo', render: () => <CashReportListTab /> },
]

export function CashPage() {
  return <ModuleContent tabs={TABS} />
}
