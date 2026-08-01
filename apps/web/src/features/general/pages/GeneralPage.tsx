import { type GeneralVoucherFilter } from '@app/shared'
import { useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GeneralReportListTab } from '@/features/report'
import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { getApiErrorMessage } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { AddMenu } from '@/shared/ui/add-menu'
import { useConfirm } from '@/shared/ui/confirm-dialog'
import { RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { RowActionMenu } from '@/shared/ui/row-action-menu'
import { useToast } from '@/shared/ui/toast'
import { Checkbox } from '@/shared/ui/checkbox'
import { Input } from '@/shared/ui/input'
import { useGeneralVouchers } from '../api/useGeneralVouchers'
import {
  useDeleteGeneralVoucher,
  useImportGeneralVouchers,
  useSetGeneralVoucherPosted,
} from '../api/useGeneralVoucherMutations'
import { GeneralFilterPopover, type GeneralFilterValue } from '../components/GeneralFilterPopover'
import { GeneralProcessTab } from '../components/GeneralProcessTab'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Card } from '@/shared/ui/card'

const PAGE_SIZE = 20

// Danh sách Chứng từ nghiệp vụ khác (NVK) — cột theo misa-specs/Chung_tu_nghiep_vu_khac.xlsx.
function GeneralVoucherTable() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const del = useDeleteGeneralVoucher()
  const setPosted = useSetGeneralVoucherPosted()
  const importXlsx = useImportGeneralVouchers()
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const confirm = useConfirm()

  // Điều hướng sang trang chứng từ full-page (§5).
  const openNew = () => navigate('/general/vouchers/new')
  const openView = (id: string) => navigate(`/general/vouchers/${id}`)
  const openEdit = (id: string) => navigate(`/general/vouchers/${id}/edit`)
  // Nhân bản: mở form tạo mới, điền sẵn dữ liệu chứng từ nguồn (số chứng từ cấp lại khi Lưu).
  const openDuplicate = (id: string) => navigate(`/general/vouchers/new?duplicateFrom=${id}`)

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
  const fromDate = params.get('from') ?? ''
  const toDate = params.get('to') ?? ''

  const filter: GeneralVoucherFilter = {
    page,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  }
  const { data, isLoading, isError, refetch, isFetching } = useGeneralVouchers(filter)

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
  const applyFilter = (v: GeneralFilterValue) => {
    const next = new URLSearchParams(params)
    for (const [k, val] of Object.entries({ from: v.from, to: v.to })) {
      if (val) next.set(k, val)
      else next.delete(k)
    }
    next.set('page', '1')
    setParams(next)
  }

  const resetFilter = () => {
    const next = new URLSearchParams(params)
    ;['from', 'to'].forEach((k) => next.delete(k))
    next.set('page', '1')
    setParams(next)
  }

  return (
    <Card className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <GeneralFilterPopover
          value={{ from: fromDate, to: toDate }}
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
            actions={[{ label: 'Chứng từ nghiệp vụ khác', onClick: openNew }]}
            onImportExcel={() => fileRef.current?.click()}
            importing={importXlsx.isPending}
          />
          <div className="relative">
            <SearchIcon
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              placeholder="Tìm kiếm"
              defaultValue={keyword}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setParam('q', (e.target as HTMLInputElement).value || null)
              }}
              className="h-8 w-44 pl-8 pr-2"
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
        <Table className="min-w-[960px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">
                <Checkbox />
              </TableHead>
              <TableHead>Ngày hạch&nbsp;toán</TableHead>
              <TableHead>Ngày chứng&nbsp;từ</TableHead>
              <TableHead>Số chứng&nbsp;từ</TableHead>
              <TableHead>Diễn&nbsp;giải</TableHead>
              <TableHead className="text-right">Số&nbsp;tiền</TableHead>
              <TableHead>Loại chứng&nbsp;từ</TableHead>
              <TableHead className="sticky right-0 z-30 bg-slate-50 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
                Chức&nbsp;năng
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-slate-400">
                  Đang tải…
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-red-500">
                  Lỗi tải dữ liệu.{' '}
                  <button className="underline" onClick={() => refetch()}>
                    Thử lại
                  </button>
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-slate-400">
                  Chưa có chứng từ nghiệp vụ khác nào.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id} className="group">
                <TableCell className="text-center">
                  <Checkbox />
                </TableCell>
                <TableCell className="whitespace-nowrap text-slate-600">
                  {formatDate(r.postingDate)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-slate-600">
                  {formatDate(r.voucherDate)}
                </TableCell>
                <TableCell>
                  <button className="text-primary hover:underline" onClick={() => openView(r.id)}>
                    {r.voucherNo}
                  </button>
                  {!r.posted && (
                    <span className="mt-0.5 block w-fit rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                      Chưa ghi sổ
                    </span>
                  )}
                </TableCell>
                <TableCell
                  className="min-w-[260px] max-w-[420px] text-slate-700"
                  title={r.description || ''}
                >
                  <div className="line-clamp-2 break-words">{r.description}</div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums text-slate-700">
                  {formatCurrency(Number(r.totalAmount))}
                </TableCell>
                <TableCell className="whitespace-nowrap text-slate-600">
                  Chứng từ nghiệp vụ khác
                </TableCell>
                <TableCell className="sticky right-0 z-10 bg-white shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50">
                  <RowActionMenu
                    onPrimary={() => openView(r.id)}
                    items={[
                      {
                        label: 'Sửa',
                        onClick: () => openEdit(r.id),
                      },
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
    </Card>
  )
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

const TABS: ModuleTab[] = [
  { key: 'process', label: 'Quy trình', render: () => <GeneralProcessTab /> },
  {
    key: 'other-voucher',
    label: 'Chứng từ nghiệp vụ khác',
    render: () => <GeneralVoucherTable />,
  },
  { key: 'report', label: 'Báo cáo', render: () => <GeneralReportListTab /> },
]

export function GeneralPage() {
  return <ModuleContent tabs={TABS} />
}
