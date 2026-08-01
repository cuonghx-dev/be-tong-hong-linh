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
import { AmountInput } from '@/shared/ui/amount-input'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useInventoryBalances } from '../api/useInventoryBalances'
import {
  useImportInventoryBalances,
  useSaveInventoryBalances,
} from '../api/useInventoryBalanceMutations'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Card } from '@/shared/ui/card'

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

  // Chỉ hiện VTHH đã có tồn (record). VTHH tồn 0 chưa tính là 1 dòng.
  const records = useMemo(
    () => rows.filter((r) => r.quantity !== 0 || r.amount !== 0),
    [rows],
  )

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return records
    return records.filter(
      (r) =>
        r.productCode.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        r.groupCode.toLowerCase().includes(q) ||
        r.warehouseCode.toLowerCase().includes(q),
    )
  }, [records, keyword])

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

  // Thêm mới: chọn 1 VTHH (đã có trong danh mục) chưa có tồn rồi nhập kho + số lượng/giá trị.
  const [addOpen, setAddOpen] = useState(false)
  const [addProductId, setAddProductId] = useState<string | null>(null)
  const [addDraft, setAddDraft] = useState<{
    warehouseCode: string
    quantity: number
    amount: number
  }>({ warehouseCode: '', quantity: 0, amount: 0 })

  // VTHH còn chọn được ở modal Thêm = có trong danh mục nhưng chưa có tồn (record).
  const addOptions = useMemo(
    () => rows.filter((r) => r.quantity === 0 && r.amount === 0),
    [rows],
  )
  const addProduct = rows.find((r) => r.productId === addProductId) ?? null

  const startEdit = (r: StockRow) => {
    setEditingIdx(rows.indexOf(r))
    setDraft({ warehouseCode: r.warehouseCode, quantity: r.quantity, amount: r.amount })
  }
  const cancelEdit = () => setEditingIdx(null)

  const openAdd = () => {
    setAddProductId(null)
    setAddDraft({ warehouseCode: '', quantity: 0, amount: 0 })
    setAddOpen(true)
  }
  const cancelAdd = () => setAddOpen(false)

  // Ghi cả bảng (backend thay thế toàn bộ dữ liệu cũ).
  const persist = (next: StockRow[]) => {
    setRows(next)
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

  // Lưu dòng đang sửa.
  const saveEdit = () => {
    if (editingIdx === null) return
    const next = rows.map((r, i) => (i === editingIdx ? { ...r, ...draft } : r))
    setEditingIdx(null)
    persist(next)
  }

  // Lưu dòng mới thêm: gán kho + tồn cho VTHH đã chọn → trở thành 1 record.
  const saveAdd = () => {
    if (!addProductId) {
      toast({ variant: 'error', title: 'Chưa chọn hàng', description: 'Chọn 1 vật tư, hàng hóa.' })
      return
    }
    if (addDraft.quantity === 0 && addDraft.amount === 0) {
      toast({ variant: 'error', title: 'Chưa nhập tồn', description: 'Nhập số lượng hoặc giá trị.' })
      return
    }
    const idx = rows.findIndex((r) => r.productId === addProductId)
    if (idx < 0) return
    const next = rows.map((r, i) => (i === idx ? { ...r, ...addDraft } : r))
    setAddOpen(false)
    persist(next)
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
    <div className="flex h-full flex-col px-6 py-5">
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

      <Card className="mt-4 flex min-h-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
          <div className="relative w-72">
            <SearchIcon
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              placeholder="Nhập từ khóa tìm kiếm"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value)
                setPage(1)
              }}
              className="h-8 pl-8 pr-2"
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
              actions={[{ label: 'Nhập tồn kho', onClick: openAdd }]}
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
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Mã hàng</TableHead>
                <TableHead>Tên hàng</TableHead>
                <TableHead className="w-28">Nhóm VTHH</TableHead>
                <TableHead className="w-24">ĐVT</TableHead>
                <TableHead className="w-44">Mã kho</TableHead>
                <TableHead className="w-36 text-right">Số&nbsp;lượng tồn</TableHead>
                <TableHead className="w-40 text-right">Giá&nbsp;trị tồn</TableHead>
                <TableHead className="w-24">Chức năng</TableHead>
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
              {!isLoading && !isError && pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-slate-400">
                    Chưa có tồn kho. Bấm “Nhập tồn kho” để chọn vật tư, hàng hóa và nhập tồn.
                  </TableCell>
                </TableRow>
              )}
              {pageRows.map((r) => (
                <TableRow
                  key={`${r.productId}|${r.warehouseCode}`}
                >
                  <TableCell className="py-1.5 text-slate-700">{r.productCode}</TableCell>
                  <TableCell className="max-w-[360px] truncate py-1.5 text-slate-700">
                    {r.productName}
                  </TableCell>
                  <TableCell className="py-1.5 text-slate-700">{r.groupCode}</TableCell>
                  <TableCell className="py-1.5 text-slate-700">{r.unit}</TableCell>
                  <TableCell className="max-w-[176px] truncate py-1.5 text-slate-700">
                    {r.warehouseCode || <span className="text-slate-400">Chưa chọn kho</span>}
                  </TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums text-slate-700">
                    {r.quantity ? formatCurrency(r.quantity) : 0}
                  </TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums text-slate-700">
                    {r.amount ? formatCurrency(r.amount) : 0}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <button
                      onClick={() => startEdit(r)}
                      className="font-medium text-primary hover:underline"
                    >
                      Sửa
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {records.length > 0 && (
              <TableFooter className="sticky bottom-0 font-semibold text-slate-800">
                <TableRow>
                  <TableCell colSpan={5}>
                    Tổng
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(totals.quantity)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(totals.amount)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
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
      </Card>

      {/* Modal sửa tồn kho 1 VTHH tại 1 kho (như MISA) */}
      <Modal open={!!editing} onClose={cancelEdit} size="md" title="Tồn kho vật tư, hàng hóa">
        {editing && (
          <div className="flex flex-col gap-4">
            <div>
              <Label className="mb-1 block text-sm font-medium text-slate-600">
                Vật tư, hàng hóa
              </Label>
              <Input
                value={`${editing.productCode} — ${editing.productName}`}
                disabled
                className="h-9 bg-slate-50 px-2 text-slate-500"
              />
              {editing.unit && <p className="mt-1 text-sm text-slate-500">ĐVT: {editing.unit}</p>}
            </div>
            <div>
              <Label className="mb-1 block text-sm font-medium text-slate-600">Kho</Label>
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
                <Label className="mb-1 block text-sm font-medium text-slate-600">
                  Số lượng tồn
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.quantity}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, quantity: Number(e.target.value) || 0 }))
                  }
                  className="h-9 px-2 text-right tabular-nums"
                />
              </div>
              <div>
                <Label className="mb-1 block text-sm font-medium text-slate-600">
                  Giá trị tồn
                </Label>
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

      {/* Modal thêm tồn kho: chọn VTHH (đã có trong danh mục) + kho + số lượng/giá trị */}
      <Modal open={addOpen} onClose={cancelAdd} size="md" title="Tồn kho vật tư, hàng hóa">
        <div className="flex flex-col gap-4">
          <div>
            <Label className="mb-1 block text-sm font-medium text-slate-600">
              Vật tư, hàng hóa
            </Label>
            <Select value={addProductId ?? ''} onValueChange={setAddProductId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Chọn vật tư, hàng hóa" />
              </SelectTrigger>
              <SelectContent>
                {addOptions.map((r) => (
                  <SelectItem key={r.productId} value={r.productId}>
                    {r.productCode} — {r.productName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {addProduct?.unit && (
              <p className="mt-1 text-sm text-slate-500">ĐVT: {addProduct.unit}</p>
            )}
          </div>
          <div>
            <Label className="mb-1 block text-sm font-medium text-slate-600">Kho</Label>
            <Select
              value={addDraft.warehouseCode || 'none'}
              onValueChange={(v) =>
                setAddDraft((d) => ({ ...d, warehouseCode: v === 'none' ? '' : v }))
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
              <Label className="mb-1 block text-sm font-medium text-slate-600">Số lượng tồn</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={addDraft.quantity}
                onChange={(e) =>
                  setAddDraft((d) => ({ ...d, quantity: Number(e.target.value) || 0 }))
                }
                className="h-9 px-2 text-right tabular-nums"
              />
            </div>
            <div>
              <Label className="mb-1 block text-sm font-medium text-slate-600">Giá trị tồn</Label>
              <AmountInput
                value={addDraft.amount}
                onChange={(v) => setAddDraft((d) => ({ ...d, amount: v }))}
                className="h-9"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={cancelAdd}
              className="h-9 rounded-md border border-border px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Đóng
            </button>
            <button
              onClick={saveAdd}
              disabled={save.isPending}
              className="h-9 rounded-md bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {save.isPending ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
