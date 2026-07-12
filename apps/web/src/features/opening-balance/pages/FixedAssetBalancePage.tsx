import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '@/shared/lib/currency'
import { AddMenu } from '@/shared/ui/add-menu'
import { useConfirm } from '@/shared/ui/confirm-dialog'
import { ChevronLeftIcon, RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { Modal } from '@/shared/ui/modal'
import { useToast } from '@/shared/ui/toast'
import { useFixedAssetBalances } from '../api/useFixedAssetBalances'
import {
  useImportFixedAssetBalances,
  useSaveFixedAssetBalances,
} from '../api/useFixedAssetBalanceMutations'
import { FixedAssetForm, type FixedAssetFormValue } from '../components/FixedAssetForm'

// Dòng TSCĐ đang hiển thị/sửa trên bảng (số tiền lưu number, ngày yyyy-MM-dd).
type AssetRow = FixedAssetFormValue

function formatDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Danh sách Tài sản cố định đầu kỳ (Danh_sach_tai_san_co_dinh_dau_ky.xlsx) — khai báo TSCĐ
// đang dùng trước ngày bắt đầu hạch toán. Lưu cả bảng sau mỗi thao tác (như Số dư tài khoản).
export function FixedAssetBalancePage() {
  const { data, isLoading, isError, refetch, isFetching } = useFixedAssetBalances()
  const save = useSaveFixedAssetBalances()
  const importXlsx = useImportFixedAssetBalances()
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const confirm = useConfirm()

  const [rows, setRows] = useState<AssetRow[]>([])
  const [keyword, setKeyword] = useState('')
  // Modal form: 'add' = thêm mới, string khác = mã tài sản đang sửa.
  const [editing, setEditing] = useState<'add' | string | null>(null)

  // Đồng bộ lại bảng mỗi khi server trả dữ liệu mới (sau load / save / import).
  useEffect(() => {
    if (!data) return
    setRows(
      data.map((r) => ({
        code: r.code,
        name: r.name,
        assetType: r.assetType,
        department: r.department,
        originalCost: Number(r.originalCost),
        depreciableValue: Number(r.depreciableValue),
        accumulatedDepreciation: Number(r.accumulatedDepreciation),
        acquisitionDate: r.acquisitionDate.slice(0, 10),
        depreciationDate: r.depreciationDate.slice(0, 10),
        usefulLifeMonths: Number(r.usefulLifeMonths),
        remainingMonths: Number(r.remainingMonths),
        assetAccount: r.assetAccount,
        depreciationAccount: r.depreciationAccount,
      })),
    )
  }, [data])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.assetType.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q),
    )
  }, [rows, keyword])

  const totals = useMemo(() => {
    let cost = 0
    let depreciable = 0
    let accumulated = 0
    for (const r of rows) {
      cost += r.originalCost
      depreciable += r.depreciableValue
      accumulated += r.accumulatedDepreciation
    }
    return { cost, depreciable, accumulated }
  }, [rows])

  // Lưu cả bảng sau mỗi thao tác (thêm/sửa/xóa) — backend thay thế toàn bộ dữ liệu cũ
  // và đồng bộ số dư TK nguyên giá/khấu hao.
  const persist = (next: AssetRow[], successTitle: string) => {
    setRows(next)
    save.mutate(
      { items: next },
      {
        onSuccess: () => toast({ variant: 'success', title: successTitle }),
        onError: () =>
          toast({ variant: 'error', title: 'Lưu thất bại', description: 'Kiểm tra lại dữ liệu.' }),
      },
    )
  }

  const editingRow = editing && editing !== 'add' ? rows.find((r) => r.code === editing) : undefined

  const onSubmitForm = (value: FixedAssetFormValue) => {
    const isAdd = editing === 'add'
    setEditing(null)
    if (isAdd) return persist([...rows, value], 'Đã thêm tài sản')
    persist(
      rows.map((r) => (r.code === editing ? value : r)),
      'Đã lưu tài sản',
    )
  }

  const onDelete = async (row: AssetRow) => {
    const ok = await confirm({
      title: 'Xóa tài sản cố định',
      description: `Xóa tài sản ${row.code} — ${row.name}?`,
      confirmText: 'Xóa',
      destructive: true,
    })
    if (!ok) return
    persist(
      rows.filter((r) => r.code !== row.code),
      'Đã xóa tài sản',
    )
  }

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

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center gap-2">
        <Link
          to="/opening-balance"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ChevronLeftIcon size={16} />
          Số dư ban đầu
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-bold text-slate-800">Tài sản cố định đầu kỳ</h1>

      <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-white">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
          <div className="relative w-72">
            <SearchIcon
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              placeholder="Nhập từ khóa tìm kiếm"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="h-8 w-full rounded-md border border-border pl-8 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={onPickFile}
          />
          <div className="ml-auto flex items-center gap-2">
            <AddMenu
              actions={[{ label: 'Thêm tài sản', onClick: () => setEditing('add') }]}
              onImportExcel={() => fileRef.current?.click()}
              importing={importXlsx.isPending}
            />
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
          <table className="w-full min-w-[1500px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-44 px-3 py-2">Mã tài sản</th>
                <th className="px-3 py-2">Tên tài sản</th>
                <th className="w-44 px-3 py-2">Loại tài sản</th>
                <th className="w-44 px-3 py-2">Đơn vị sử dụng</th>
                <th className="w-36 px-3 py-2 text-right">Nguyên giá</th>
                <th className="w-36 px-3 py-2 text-right">Giá trị tính KH</th>
                <th className="w-36 px-3 py-2 text-right">Hao mòn lũy kế</th>
                <th className="w-28 px-3 py-2">Ngày ghi tăng</th>
                <th className="w-28 px-3 py-2">Ngày tính KH</th>
                <th className="w-24 px-3 py-2 text-right">TG SD (tháng)</th>
                <th className="w-24 px-3 py-2 text-right">Còn lại (tháng)</th>
                <th className="w-24 px-3 py-2">TK nguyên giá</th>
                <th className="w-24 px-3 py-2">TK khấu hao</th>
                <th className="sticky right-0 z-20 w-28 bg-slate-50 px-3 py-2 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
                  Chức năng
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={14} className="px-3 py-10 text-center text-slate-400">
                    Đang tải…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={14} className="px-3 py-10 text-center text-red-500">
                    Lỗi tải dữ liệu.{' '}
                    <button className="underline" onClick={() => refetch()}>
                      Thử lại
                    </button>
                  </td>
                </tr>
              )}
              {!isLoading && !isError && filtered.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-3 py-10 text-center text-slate-400">
                    Chưa có tài sản cố định. Thêm tài sản hoặc nhập khẩu từ Excel.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.code} className="group border-t border-border hover:bg-slate-50">
                  <td className="px-3 py-1.5">
                    <button
                      onClick={() => setEditing(r.code)}
                      className="text-primary hover:underline"
                    >
                      {r.code}
                    </button>
                  </td>
                  <td className="max-w-[320px] truncate px-3 py-1.5 text-slate-700">{r.name}</td>
                  <td className="max-w-[176px] truncate px-3 py-1.5 text-slate-700">
                    {r.assetType}
                  </td>
                  <td className="max-w-[176px] truncate px-3 py-1.5 text-slate-700">
                    {r.department}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">
                    {r.originalCost ? formatCurrency(r.originalCost) : 0}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">
                    {r.depreciableValue ? formatCurrency(r.depreciableValue) : 0}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">
                    {r.accumulatedDepreciation ? formatCurrency(r.accumulatedDepreciation) : 0}
                  </td>
                  <td className="px-3 py-1.5 tabular-nums text-slate-700">
                    {formatDate(r.acquisitionDate)}
                  </td>
                  <td className="px-3 py-1.5 tabular-nums text-slate-700">
                    {formatDate(r.depreciationDate)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">
                    {r.usefulLifeMonths}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">
                    {r.remainingMonths}
                  </td>
                  <td className="px-3 py-1.5 tabular-nums text-slate-700">{r.assetAccount}</td>
                  <td className="px-3 py-1.5 tabular-nums text-slate-700">
                    {r.depreciationAccount}
                  </td>
                  <td className="sticky right-0 z-10 bg-white px-3 py-1.5 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditing(r.code)}
                        className="font-medium text-primary hover:underline"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => onDelete(r)}
                        className="font-medium text-red-500 hover:underline"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="sticky bottom-0 border-t border-border bg-slate-50 font-semibold text-slate-800">
                <tr>
                  <td colSpan={4} className="px-3 py-2">
                    Tổng cộng
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCurrency(totals.cost)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCurrency(totals.depreciable)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCurrency(totals.accumulated)}
                  </td>
                  <td colSpan={6} />
                  <td className="sticky right-0 bg-slate-50" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center border-t border-border px-3 py-2 text-sm text-slate-500">
          <span>
            Tổng số: <b className="text-slate-700">{filtered.length}</b> tài sản
          </span>
        </div>
      </div>

      {/* Modal thêm/sửa 1 tài sản cố định. */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        size="xl"
        title={editing === 'add' ? 'Thêm tài sản cố định' : 'Sửa tài sản cố định'}
      >
        {editing && (
          <FixedAssetForm
            initial={editingRow}
            existingCodes={rows.map((r) => r.code).filter((c) => c !== editing)}
            onSubmit={onSubmitForm}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  )
}
