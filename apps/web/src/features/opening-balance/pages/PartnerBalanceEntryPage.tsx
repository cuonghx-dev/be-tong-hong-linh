import { PartnerType } from '@app/shared'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useNavigateBack } from '@/shared/hooks/use-navigate-back'
import { formatCurrency } from '@/shared/lib/currency'
import { AddMenu } from '@/shared/ui/add-menu'
import { SearchIcon } from '@/shared/ui/icons'
import { Modal } from '@/shared/ui/modal'
import { PartnerPicker } from '@/shared/ui/partner-picker'
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
import { usePartnerBalances } from '../api/usePartnerBalances'
import {
  useImportPartnerBalances,
  useSavePartnerBalances,
} from '../api/usePartnerBalanceMutations'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const PAGE_SIZES = [20, 50, 100]

// Tiêu đề + nhãn cột + slug danh mục theo loại TK công nợ (khách hàng 131 vs nhà cung cấp 331).
function partnerLabels(accountCode: string) {
  if (accountCode.startsWith('331'))
    return {
      title: 'Nhập số dư công nợ nhà cung cấp',
      code: 'Mã nhà cung cấp',
      name: 'Tên nhà cung cấp',
      catalogSlug: 'nha-cung-cap',
      catalogLabel: 'Nhà cung cấp',
      editTitle: 'Sửa chi tiết công nợ nhà cung cấp',
      partnerField: 'Nhà cung cấp',
    }
  return {
    title: 'Nhập số dư công nợ khách hàng',
    code: 'Mã khách hàng',
    name: 'Tên khách hàng',
    catalogSlug: 'khach-hang',
    catalogLabel: 'Khách hàng',
    editTitle: 'Sửa chi tiết công nợ khách hàng',
    partnerField: 'Khách hàng',
  }
}

interface EditRow {
  partnerId: string
  partnerCode: string
  partnerName: string
  debitAmount: number
  creditAmount: number
}

// Màn "Nhập số dư công nợ" — nhập Dư Nợ/Dư Có đầu kỳ theo từng đối tượng cho 1 TK công nợ.
// Vào từ cột "Chi tiết số dư" của màn Nhập số dư tài khoản (?account=<số TK>). Full-page, đè shell.
export function PartnerBalanceEntryPage() {
  const [params] = useSearchParams()
  const accountCode = params.get('account') ?? ''
  const labels = partnerLabels(accountCode)
  const partnerKind = accountCode.startsWith('331') ? 'supplier' : 'customer'

  const { data, isLoading, isError, refetch } = usePartnerBalances(accountCode)
  const save = useSavePartnerBalances()
  const importXlsx = useImportPartnerBalances()
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const [rows, setRows] = useState<EditRow[]>([])
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    if (!data) return
    setRows(
      data.items.map((r) => ({
        partnerId: r.partnerId,
        partnerCode: r.partnerCode,
        partnerName: r.partnerName,
        debitAmount: Number(r.debitAmount),
        creditAmount: Number(r.creditAmount),
      })),
    )
  }, [data])

  // Chỉ hiện các đối tượng đã có số dư (record). Đối tượng số dư 0 chưa tính là 1 dòng công nợ.
  const records = useMemo(
    () => rows.filter((r) => r.debitAmount !== 0 || r.creditAmount !== 0),
    [rows],
  )

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return records
    return records.filter(
      (r) =>
        r.partnerCode.toLowerCase().includes(q) || r.partnerName.toLowerCase().includes(q),
    )
  }, [records, keyword])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pageCount)
  const pageRows = filtered.slice((current - 1) * pageSize, current * pageSize)

  // Tổng cộng toàn bộ đối tượng (2 vế cân khi số dư đúng).
  const totals = useMemo(() => {
    let debit = 0
    let credit = 0
    for (const r of rows) {
      debit += r.debitAmount
      credit += r.creditAmount
    }
    return { debit, credit }
  }, [rows])

  // Sửa 1 dòng: mở modal nhập Dư Nợ/Dư Có cho đúng đối tượng đó (draft tách khỏi rows).
  const [editing, setEditing] = useState<EditRow | null>(null)
  const [draft, setDraft] = useState<{ debit: number; credit: number }>({ debit: 0, credit: 0 })

  // Thêm mới: chọn 1 đối tượng (đã có trong danh mục) chưa có số dư rồi nhập Dư Nợ/Dư Có.
  const [addOpen, setAddOpen] = useState(false)
  const [addPartnerId, setAddPartnerId] = useState<string | null>(null)
  const [addKeyword, setAddKeyword] = useState('')
  const [addDraft, setAddDraft] = useState<{ debit: number; credit: number }>({ debit: 0, credit: 0 })

  const partnerType = partnerKind === 'supplier' ? PartnerType.Supplier : PartnerType.Customer

  // Đối tượng còn chọn được ở modal Thêm = có trong danh mục nhưng chưa có số dư (record).
  const addOptions = useMemo(() => {
    const q = addKeyword.trim().toLowerCase()
    const avail = rows.filter((r) => r.debitAmount === 0 && r.creditAmount === 0)
    const list = q
      ? avail.filter(
          (r) =>
            r.partnerCode.toLowerCase().includes(q) || r.partnerName.toLowerCase().includes(q),
        )
      : avail
    return list.map((r) => ({ code: r.partnerCode, name: r.partnerName, type: partnerType }))
  }, [rows, addKeyword, partnerType])

  const addPartner = rows.find((r) => r.partnerId === addPartnerId) ?? null

  const close = useNavigateBack('/opening-balance/so-du-tai-khoan')

  // Nhập khẩu từ file Excel MISA (Danh_sach_cong_no_khach_hang.xlsx…) cho TK đang mở.
  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // cho phép chọn lại cùng file
    if (!file) return
    importXlsx.mutate(
      { accountCode, file },
      {
        onSuccess: (r) =>
          toast({
            variant: 'success',
            title: 'Nhập khẩu thành công',
            description: `${r.created} đối tượng mới, bỏ qua ${r.skipped} (tổng ${r.total}).`,
          }),
        onError: () =>
          toast({
            variant: 'error',
            title: 'Nhập khẩu thất bại',
            description: 'Kiểm tra lại file Excel.',
          }),
      },
    )
  }

  const startEdit = (r: EditRow) => {
    setEditing(r)
    setDraft({ debit: r.debitAmount, credit: r.creditAmount })
  }
  const cancelEdit = () => setEditing(null)

  const openAdd = () => {
    setAddPartnerId(null)
    setAddKeyword('')
    setAddDraft({ debit: 0, credit: 0 })
    setAddOpen(true)
  }
  const cancelAdd = () => setAddOpen(false)

  // Ghi cả bảng (backend thay thế toàn bộ số dư công nợ của TK bằng payload).
  const persist = (next: EditRow[]) => {
    setRows(next)
    save.mutate(
      {
        accountCode,
        items: next.map((r) => ({
          partnerId: r.partnerId,
          debitAmount: r.debitAmount,
          creditAmount: r.creditAmount,
        })),
      },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Đã lưu số dư công nợ' }),
        onError: () =>
          toast({ variant: 'error', title: 'Lưu thất bại', description: 'Kiểm tra lại dữ liệu.' }),
      },
    )
  }

  // Lưu dòng đang sửa.
  const saveEdit = (partnerId: string) => {
    const next = rows.map((r) =>
      r.partnerId === partnerId
        ? { ...r, debitAmount: draft.debit, creditAmount: draft.credit }
        : r,
    )
    setEditing(null)
    persist(next)
  }

  // Lưu dòng mới thêm: gán số dư cho đối tượng đã chọn → trở thành 1 record công nợ.
  const saveAdd = () => {
    if (!addPartnerId) {
      toast({ variant: 'error', title: 'Chưa chọn đối tượng', description: 'Chọn 1 đối tượng.' })
      return
    }
    if (addDraft.debit === 0 && addDraft.credit === 0) {
      toast({ variant: 'error', title: 'Chưa nhập số dư', description: 'Nhập Dư Nợ hoặc Dư Có.' })
      return
    }
    const next = rows.map((r) =>
      r.partnerId === addPartnerId
        ? { ...r, debitAmount: addDraft.debit, creditAmount: addDraft.credit }
        : r,
    )
    setAddOpen(false)
    persist(next)
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold text-slate-800">{labels.title}</h1>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-600">
          TK {accountCode || '—'}
        </span>
        <Link
          to={`/catalog/${labels.catalogSlug}`}
          className="text-sm text-primary hover:underline"
        >
          Danh mục {labels.catalogLabel}
        </Link>
        <button
          onClick={close}
          className="ml-auto grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
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
        <div className="ml-auto">
          <AddMenu
            actions={[{ label: 'Nhập số dư', onClick: openAdd }]}
            onImportExcel={() => fileRef.current?.click()}
            importing={importXlsx.isPending}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Số tài&nbsp;khoản</TableHead>
              <TableHead className="w-48">{labels.code}</TableHead>
              <TableHead>{labels.name}</TableHead>
              <TableHead className="w-48 text-right">Dư&nbsp;Nợ</TableHead>
              <TableHead className="w-48 text-right">Dư&nbsp;Có</TableHead>
              <TableHead className="w-24">Chức năng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-slate-400">
                  Đang tải…
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-red-500">
                  Lỗi tải dữ liệu.{' '}
                  <button className="underline" onClick={() => refetch()}>
                    Thử lại
                  </button>
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-slate-400">
                  Chưa có số dư công nợ. Bấm “Thêm” để chọn đối tượng và nhập số dư.
                </TableCell>
              </TableRow>
            )}
            {pageRows.map((r) => (
              <TableRow key={r.partnerId}>
                <TableCell className="py-1.5 tabular-nums text-slate-700">{accountCode}</TableCell>
                <TableCell className="py-1.5 text-slate-700">{r.partnerCode}</TableCell>
                <TableCell className="max-w-[360px] truncate py-1.5 text-slate-700">
                  {r.partnerName}
                </TableCell>
                <TableCell className="py-1.5 text-right tabular-nums text-slate-700">
                  {r.debitAmount ? formatCurrency(r.debitAmount) : 0}
                </TableCell>
                <TableCell className="py-1.5 text-right tabular-nums text-slate-700">
                  {r.creditAmount ? formatCurrency(r.creditAmount) : 0}
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
                <TableCell colSpan={3}>
                  Tổng
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(totals.debit)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(totals.credit)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-sm text-slate-500">
        <span>
          Tổng số: <b className="text-slate-700">{filtered.length}</b> bản ghi
        </span>
        {totals.debit !== totals.credit && (
          <span className="text-amber-600">
            Lệch Nợ/Có: {formatCurrency(Math.abs(totals.debit - totals.credit))}
          </span>
        )}
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

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-border bg-slate-900 px-4 py-2">
        <button
          onClick={close}
          className="h-9 rounded-md bg-white px-5 text-sm font-medium text-slate-800 hover:bg-slate-100"
        >
          Đóng
        </button>
      </div>

      {/* Modal sửa số dư công nợ 1 đối tượng (như MISA) */}
      <Modal open={!!editing} onClose={cancelEdit} size="xl" title={labels.editTitle}>
        {editing && (
          <div className="flex flex-col gap-4">
            <div>
              <Label className="mb-1 block text-sm font-medium text-slate-600">Số tài khoản</Label>
              <Input
                value={accountCode}
                disabled
                className="h-9 bg-slate-50 px-2 text-slate-500"
              />
            </div>
            <div className="grid grid-cols-[1fr_auto_auto] items-end gap-3">
              <div>
                <Label className="mb-1 block text-sm font-medium text-slate-600">
                  {labels.partnerField}
                </Label>
                <Input
                  value={editing.partnerName}
                  disabled
                  className="h-9 bg-slate-50 px-2 text-slate-500"
                />
              </div>
              <div className="w-48">
                <Label className="mb-1 block text-sm font-medium text-slate-600">Dư Nợ</Label>
                <AmountInput
                  value={draft.debit}
                  onChange={(v) => setDraft((d) => ({ ...d, debit: v }))}
                />
              </div>
              <div className="w-48">
                <Label className="mb-1 block text-sm font-medium text-slate-600">Dư Có</Label>
                <AmountInput
                  value={draft.credit}
                  onChange={(v) => setDraft((d) => ({ ...d, credit: v }))}
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
                onClick={() => saveEdit(editing.partnerId)}
                disabled={save.isPending}
                className="h-9 rounded-md bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {save.isPending ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal thêm số dư công nợ: chọn đối tượng (đã có trong danh mục) + nhập Dư Nợ/Dư Có */}
      <Modal open={addOpen} onClose={cancelAdd} size="xl" title={labels.title}>
        <div className="flex flex-col gap-4">
          <div>
            <Label className="mb-1 block text-sm font-medium text-slate-600">Số tài khoản</Label>
            <Input
              value={accountCode}
              disabled
              className="h-9 bg-slate-50 px-2 text-slate-500"
            />
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] items-end gap-3">
            <div>
              <Label className="mb-1 block text-sm font-medium text-slate-600">
                {labels.partnerField}
              </Label>
              <PartnerPicker
                value={addPartner ? `${addPartner.partnerCode} - ${addPartner.partnerName}` : ''}
                items={addOptions}
                loading={isLoading}
                keyword={addKeyword}
                onKeywordChange={setAddKeyword}
                onSelect={(p) => {
                  const row = rows.find((r) => r.partnerCode === p.code)
                  if (row) setAddPartnerId(row.partnerId)
                }}
                placeholder={labels.code}
              />
            </div>
            <div className="w-48">
              <Label className="mb-1 block text-sm font-medium text-slate-600">Dư Nợ</Label>
              <AmountInput
                value={addDraft.debit}
                onChange={(v) => setAddDraft((d) => ({ ...d, debit: v }))}
              />
            </div>
            <div className="w-48">
              <Label className="mb-1 block text-sm font-medium text-slate-600">Dư Có</Label>
              <AmountInput
                value={addDraft.credit}
                onChange={(v) => setAddDraft((d) => ({ ...d, credit: v }))}
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
