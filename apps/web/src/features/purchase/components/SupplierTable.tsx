import type { SupplierFilter } from '@app/shared'
import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { formatCurrency } from '@/shared/lib/currency'
import { cn } from '@/shared/lib/cn'
import { AddMenu } from '@/shared/ui/add-menu'
import { useConfirm } from '@/shared/ui/confirm-dialog'
import { RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { Modal } from '@/shared/ui/modal'
import { RowActionMenu } from '@/shared/ui/row-action-menu'
import { useToast } from '@/shared/ui/toast'
import { Checkbox } from '@/shared/ui/checkbox'
import { Input } from '@/shared/ui/input'
import { useSuppliers } from '../api/useSuppliers'
import {
  useDeleteSupplier,
  useImportSuppliers,
  useUpdateSupplier,
} from '../api/useSupplierMutations'
import { SupplierForm } from './SupplierForm'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const PAGE_SIZE = 20

// Query params riêng cho tab NCC (tránh đụng param của tab mua hàng).
const P = { page: 'sp_page', q: 'sp_q' }

export function SupplierTable() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [formState, setFormState] = useState<{
    supplierId?: string
    duplicateFromId?: string
    readOnly?: boolean
  } | null>(null)
  const del = useDeleteSupplier()
  const upd = useUpdateSupplier()
  const importXlsx = useImportSuppliers()
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
          description: `${r.created} NCC mới, bỏ qua ${r.skipped} trùng (tổng ${r.total}).`,
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

  const filter: SupplierFilter = {
    page,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
  }
  const { data, isLoading, isError, refetch, isFetching } = useSuppliers(filter)

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

        <div className="ml-auto flex items-center gap-2">
          <AddMenu
            actions={[{ label: 'Nhà cung cấp', onClick: () => setFormState({}) }]}
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
                if (e.key === 'Enter') setParam(P.q, (e.target as HTMLInputElement).value || null)
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
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">
                <Checkbox />
              </TableHead>
              <TableHead>Mã NCC</TableHead>
              <TableHead>Tên nhà cung&nbsp;cấp</TableHead>
              <TableHead>Địa&nbsp;chỉ</TableHead>
              <TableHead className="text-right">Số&nbsp;tiền nợ</TableHead>
              <TableHead>Mã&nbsp;số thuế/CCCD</TableHead>
              <TableHead className="sticky right-0 z-30 bg-slate-50 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
                Chức&nbsp;năng
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-slate-400">
                  Đang tải…
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-red-500">
                  Lỗi tải dữ liệu.{' '}
                  <button className="underline" onClick={() => refetch()}>
                    Thử lại
                  </button>
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-slate-400">
                  Chưa có nhà cung cấp nào.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => {
              const debt = Number(r.debtAmount)
              return (
                <TableRow key={r.id} className="group">
                  <TableCell className="text-center">
                    <Checkbox />
                  </TableCell>
                  <TableCell>
                    <button
                      className="text-primary hover:underline"
                      onClick={() => setFormState({ supplierId: r.id, readOnly: true })}
                    >
                      {r.code}
                    </button>
                  </TableCell>
                  <TableCell className="max-w-[220px]">
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
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-slate-600">{r.address}</TableCell>
                  <TableCell
                    className={cn(
                      'whitespace-nowrap px-3 py-2 text-right tabular-nums',
                      debt > 0 ? 'text-red-600' : 'text-slate-600',
                    )}
                  >
                    {debt > 0 ? `(${formatCurrency(debt)})` : formatCurrency(debt)}
                  </TableCell>
                  <TableCell className="text-slate-600">{r.taxCode}</TableCell>
                  <TableCell className="sticky right-0 z-10 bg-white shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50">
                    <RowActionMenu
                      primaryLabel="Lập CT mua hàng"
                      onPrimary={() => {
                        // Điền sẵn NCC vào chứng từ mua hàng mới qua query params.
                        const q = new URLSearchParams({ supplier: r.code, supplierName: r.name })
                        if (r.address) q.set('supplierAddress', r.address)
                        navigate(`/purchase/vouchers/new?${q.toString()}`)
                      }}
                      items={[
                        {
                          label: 'Xem',
                          onClick: () => setFormState({ supplierId: r.id, readOnly: true }),
                        },
                        {
                          label: 'Sửa',
                          onClick: () => setFormState({ supplierId: r.id }),
                        },
                        {
                          label: 'Nhân bản',
                          onClick: () => setFormState({ duplicateFromId: r.id }),
                        },
                        {
                          label: 'Xóa',
                          danger: true,
                          onClick: async () => {
                            const ok = await confirm({
                              title: `Xóa nhà cung cấp ${r.code}?`,
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
                  </TableCell>
                </TableRow>
              )
            })}
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
            ? 'Xem nhà cung cấp'
            : formState?.supplierId
              ? 'Sửa nhà cung cấp'
              : formState?.duplicateFromId
                ? 'Nhân bản nhà cung cấp'
                : 'Thông tin nhà cung cấp'
        }
      >
        {formState && (
          <SupplierForm
            key={formState.supplierId ?? formState.duplicateFromId ?? 'new'}
            supplierId={formState.supplierId ?? null}
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
