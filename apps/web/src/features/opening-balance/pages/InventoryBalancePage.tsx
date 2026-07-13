import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '@/shared/lib/currency'
import { AddMenu } from '@/shared/ui/add-menu'
import { ChevronLeftIcon, RefreshIcon, SearchIcon } from '@/shared/ui/icons'
import { Modal } from '@/shared/ui/modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useToast } from '@/shared/ui/toast'
import { AmountInput } from '../components/AmountInput'
import { useInventoryBalances } from '../api/useInventoryBalances'
import {
  useImportInventoryBalances,
  useSaveInventoryBalances,
} from '../api/useInventoryBalanceMutations'

const PAGE_SIZES = [20, 50, 100]

// Dòng tồn kho của 1 VTHH tại 1 kho đang hiển thị/sửa trên bảng.
interface StockRow {
  productId: string
  productCode: string
  productName: string
  groupCode: string
  unit: string
  warehouseCode: string
  quantity: number
  amount: number
}

// Tồn kho đầu kỳ vật tư, hàng hóa, CCDC (Danh_sach_ton_kho_vthh.xlsx) — nhập Số lượng tồn/
// Giá trị tồn theo từng VTHH + kho. Danh sách VTHH lấy từ danh mục (như công nợ/tiền gửi);
// lưu cả bảng sau mỗi thao tác, backend đồng bộ số dư TK kho (152/153/155/156).
export function InventoryBalancePage() {
  const { data, isLoading, isError, refetch, isFetching } = useInventoryBalances()
  const save = useSaveInventoryBalances()
  const importXlsx = useImportInventoryBalances()
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const [rows, setRows] = useState<StockRow[]>([])
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Đồng bộ lại bảng mỗi khi server trả dữ liệu mới (sau load / save / import).
  useEffect(() => {
    if (!data) return
    setRows(
      data.items.map((r) => ({
        productId: r.productId,
        productCode: r.productCode,
        productName: r.productName,
        groupCode: r.groupCode,
        unit: r.unit,
        warehouseCode: r.warehouseCode,
        quantity: Number(r.quantity),
        amount: Number(r.amount),
      })),
    )
  }, [data])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.productCode.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        r.groupCode.toLowerCase().includes(q) ||
        r.warehouseCode.toLowerCase().includes(q),
    )
  }, [rows, keyword])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pageCount)
  const pageRows = filtered.slice((current - 1) * pageSize, current * pageSize)

  // Tổng cộng toàn bộ VTHH (như dòng "Tổng" file MISA).
  const totals = useMemo(() => {
    let quantity = 0
    let amount = 0
    for (const r of rows) {
      quantity += r.quantity
      amount += r.amount
    }
    return { quantity, amount }
  }, [rows])

  // Sửa 1 dòng: mở modal chọn kho + nhập Số lượng tồn/Giá trị tồn (draft tách khỏi rows).
  // Định danh dòng theo index trong rows (1 VTHH có thể tồn ở nhiều kho).
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [draft, setDraft] = useState<{ warehouseCode: string; quantity: number; amount: number }>({
    warehouseCode: '',
    quantity: 0,
    amount: 0,
  })
  const editing = editingIdx !== null ? rows[editingIdx] : undefined

  const startEdit = (r: StockRow) => {
    setEditingIdx(rows.indexOf(r))
    setDraft({ warehouseCode: r.warehouseCode, quantity: r.quantity, amount: r.amount })
  }
  const cancelEdit = () => setEditingIdx(null)

  // Lưu dòng đang sửa → cập nhật rows rồi ghi cả bảng (backend thay thế toàn bộ dữ liệu cũ).
  const saveEdit = () => {
    if (editingIdx === null) return
    const next = rows.map((r, i) => (i === editingIdx ? { ...r, ...draft } : r))
    setRows(next)
    setEditingIdx(null)
    save.mutate(
      {
        items: next.map((r) => ({
          productId: r.productId,
          warehouseCode: r.warehouseCode,
          quantity: r.quantity,
          amount: r.amount,
        })),
      },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Đã lưu tồn kho đầu kỳ' }),
        onError: () =>
          toast({ variant: 'error', title: 'Lưu thất bại', description: 'Kiểm tra lại dữ liệu.' }),
      },
    )
  }

  // Nhập khẩu từ file Excel MISA (Danh_sach_ton_kho_vthh.xlsx).
  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // cho phép chọn lại cùng file
    if (!file) return
    importXlsx.mutate(file, {
      onSuccess: (r) =>
        toast({
          variant: 'success',
          title: 'Nhập khẩu thành công',
          description: `${r.created} dòng tồn mới, bỏ qua ${r.skipped} (tổng ${r.total}).`,
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
      <div className="mt-2 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Tồn kho vật tư, hàng hóa và CCDC</h1>
        <Link to="/catalog/vat-tu-hang-hoa" className="text-sm text-primary hover:underline">
          Danh mục Vật tư hàng hóa
        </Link>
      </div>

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
              onChange={(e) => {
                setKeyword(e.target.value)
                setPage(1)
              }}
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
              actions={[]}
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
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-44 px-3 py-2">Mã hàng</th>
                <th className="px-3 py-2">Tên hàng</th>
                <th className="w-28 px-3 py-2">Nhóm VTHH</th>
                <th className="w-24 px-3 py-2">ĐVT</th>
                <th className="w-44 px-3 py-2">Mã kho</th>
                <th className="w-36 px-3 py-2 text-right">Số lượng tồn</th>
                <th className="w-40 px-3 py-2 text-right">Giá trị tồn</th>
                <th className="w-24 px-3 py-2">Chức năng</th>
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
              {!isLoading && !isError && pageRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-slate-400">
                    Không có vật tư, hàng hóa nào. Thêm ở danh mục trước khi nhập tồn kho.
                  </td>
                </tr>
              )}
              {pageRows.map((r) => (
                <tr
                  key={`${r.productId}|${r.warehouseCode}`}
                  className="border-t border-border hover:bg-slate-50"
                >
                  <td className="px-3 py-1.5 text-slate-700">{r.productCode}</td>
                  <td className="max-w-[360px] truncate px-3 py-1.5 text-slate-700">
                    {r.productName}
                  </td>
                  <td className="px-3 py-1.5 text-slate-700">{r.groupCode}</td>
                  <td className="px-3 py-1.5 text-slate-700">{r.unit}</td>
                  <td className="max-w-[176px] truncate px-3 py-1.5 text-slate-700">
                    {r.warehouseCode || <span className="text-slate-400">Chưa chọn kho</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">
                    {r.quantity ? formatCurrency(r.quantity) : 0}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">
                    {r.amount ? formatCurrency(r.amount) : 0}
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      onClick={() => startEdit(r)}
                      className="font-medium text-primary hover:underline"
                    >
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="sticky bottom-0 border-t border-border bg-slate-50 font-semibold text-slate-800">
                <tr>
                  <td colSpan={5} className="px-3 py-2">
                    Tổng
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCurrency(totals.quantity)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCurrency(totals.amount)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-sm text-slate-500">
          <span>
            Tổng số: <b className="text-slate-700">{filtered.length}</b> bản ghi
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v))
                setPage(1)
              }}
            >
              <SelectTrigger className="h-8 w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s} bản ghi trên 1 trang
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={current <= 1}
              className="h-8 rounded-md px-2 hover:bg-slate-100 disabled:opacity-40"
            >
              Trước
            </button>
            <span className="text-slate-700">{current}</span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={current >= pageCount}
              className="h-8 rounded-md px-2 hover:bg-slate-100 disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Modal sửa tồn kho 1 VTHH tại 1 kho (như MISA) */}
      <Modal open={!!editing} onClose={cancelEdit} size="md" title="Tồn kho vật tư, hàng hóa">
        {editing && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                Vật tư, hàng hóa
              </label>
              <input
                value={`${editing.productCode} — ${editing.productName}`}
                disabled
                className="h-9 w-full rounded-md border border-border bg-slate-50 px-2 text-sm text-slate-500"
              />
              {editing.unit && <p className="mt-1 text-sm text-slate-500">ĐVT: {editing.unit}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Kho</label>
              <Select
                value={draft.warehouseCode || 'none'}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, warehouseCode: v === 'none' ? '' : v }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Chưa chọn kho —</SelectItem>
                  {data?.warehouses.map((w) => (
                    <SelectItem key={w.code} value={w.code}>
                      {w.code} — {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">
                  Số lượng tồn
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.quantity}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, quantity: Number(e.target.value) || 0 }))
                  }
                  className="h-9 w-full rounded-md border border-border px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">
                  Giá trị tồn
                </label>
                <AmountInput
                  value={draft.amount}
                  onChange={(v) => setDraft((d) => ({ ...d, amount: v }))}
                  className="h-9"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={cancelEdit}
                className="h-9 rounded-md border border-border px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
              <button
                onClick={saveEdit}
                disabled={save.isPending}
                className="h-9 rounded-md bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {save.isPending ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
