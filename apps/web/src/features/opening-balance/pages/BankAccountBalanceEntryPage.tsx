import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useNavigateBack } from '@/shared/hooks/use-navigate-back'
import { formatCurrency } from '@/shared/lib/currency'
import { AddMenu } from '@/shared/ui/add-menu'
import { SearchIcon } from '@/shared/ui/icons'
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
import { useBankAccountBalances } from '../api/useBankAccountBalances'
import {
  useImportBankAccountBalances,
  useSaveBankAccountBalances,
} from '../api/useBankAccountBalanceMutations'

const PAGE_SIZES = [20, 50, 100]

interface EditRow {
  bankAccountId: string
  accountNumber: string
  bankName: string
  debitAmount: number
  creditAmount: number
}

// Màn "Nhập số dư tài khoản ngân hàng" — nhập Dư Nợ/Dư Có đầu kỳ theo từng TK ngân hàng cho 1 TK tiền gửi.
// Vào thẳng từ nút "Sửa" của TK tiền gửi (112x) ở trang Số dư tài khoản (?account=<số TK>). Full-page, đè shell.
export function BankAccountBalanceEntryPage() {
  const [params] = useSearchParams()
  const accountCode = params.get('account') ?? ''

  const { data, isLoading, isError, refetch } = useBankAccountBalances(accountCode)
  const save = useSaveBankAccountBalances()
  const importXlsx = useImportBankAccountBalances()
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
        bankAccountId: r.bankAccountId,
        accountNumber: r.accountNumber,
        bankName: r.bankName,
        debitAmount: Number(r.debitAmount),
        creditAmount: Number(r.creditAmount),
      })),
    )
  }, [data])

  // Chỉ hiện TK ngân hàng đã có số dư (record). TK số dư 0 chưa tính là 1 dòng.
  const records = useMemo(
    () => rows.filter((r) => r.debitAmount !== 0 || r.creditAmount !== 0),
    [rows],
  )

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return records
    return records.filter(
      (r) =>
        r.accountNumber.toLowerCase().includes(q) || r.bankName.toLowerCase().includes(q),
    )
  }, [records, keyword])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pageCount)
  const pageRows = filtered.slice((current - 1) * pageSize, current * pageSize)

  // Tổng cộng toàn bộ TK ngân hàng (thường chỉ có Dư Nợ với TK tiền gửi).
  const totals = useMemo(() => {
    let debit = 0
    let credit = 0
    for (const r of rows) {
      debit += r.debitAmount
      credit += r.creditAmount
    }
    return { debit, credit }
  }, [rows])

  // Sửa 1 dòng: mở modal nhập Dư Nợ/Dư Có cho đúng TK ngân hàng đó (draft tách khỏi rows).
  const [editing, setEditing] = useState<EditRow | null>(null)
  const [draft, setDraft] = useState<{ debit: number; credit: number }>({ debit: 0, credit: 0 })

  // Thêm mới: chọn 1 TK ngân hàng (đã có trong danh mục) chưa có số dư rồi nhập Dư Nợ/Dư Có.
  const [addOpen, setAddOpen] = useState(false)
  const [addBankAccountId, setAddBankAccountId] = useState<string | null>(null)
  const [addDraft, setAddDraft] = useState<{ debit: number; credit: number }>({ debit: 0, credit: 0 })

  // TK ngân hàng còn chọn được ở modal Thêm = có trong danh mục nhưng chưa có số dư (record).
  const addOptions = useMemo(
    () => rows.filter((r) => r.debitAmount === 0 && r.creditAmount === 0),
    [rows],
  )
  const addBankAccount = rows.find((r) => r.bankAccountId === addBankAccountId) ?? null

  const close = useNavigateBack('/opening-balance/so-du-tai-khoan')

  const startEdit = (r: EditRow) => {
    setEditing(r)
    setDraft({ debit: r.debitAmount, credit: r.creditAmount })
  }
  const cancelEdit = () => setEditing(null)

  const openAdd = () => {
    setAddBankAccountId(null)
    setAddDraft({ debit: 0, credit: 0 })
    setAddOpen(true)
  }
  const cancelAdd = () => setAddOpen(false)

  // Nhập khẩu số dư tiền gửi từ file Excel cho TK đang mở.
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
            description: `${r.created} tài khoản mới, bỏ qua ${r.skipped} (tổng ${r.total}).`,
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

  // Ghi cả bảng (backend thay thế toàn bộ số dư TK ngân hàng của TK bằng payload).
  const persist = (next: EditRow[]) => {
    setRows(next)
    save.mutate(
      {
        accountCode,
        items: next.map((r) => ({
          bankAccountId: r.bankAccountId,
          debitAmount: r.debitAmount,
          creditAmount: r.creditAmount,
        })),
      },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Đã lưu số dư tài khoản ngân hàng' }),
        onError: () =>
          toast({ variant: 'error', title: 'Lưu thất bại', description: 'Kiểm tra lại dữ liệu.' }),
      },
    )
  }

  // Lưu dòng đang sửa.
  const saveEdit = (bankAccountId: string) => {
    const next = rows.map((r) =>
      r.bankAccountId === bankAccountId
        ? { ...r, debitAmount: draft.debit, creditAmount: draft.credit }
        : r,
    )
    setEditing(null)
    persist(next)
  }

  // Lưu dòng mới thêm: gán số dư cho TK ngân hàng đã chọn → trở thành 1 record.
  const saveAdd = () => {
    if (!addBankAccountId) {
      toast({ variant: 'error', title: 'Chưa chọn tài khoản', description: 'Chọn 1 TK ngân hàng.' })
      return
    }
    if (addDraft.debit === 0 && addDraft.credit === 0) {
      toast({ variant: 'error', title: 'Chưa nhập số dư', description: 'Nhập Dư Nợ hoặc Dư Có.' })
      return
    }
    const next = rows.map((r) =>
      r.bankAccountId === addBankAccountId
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
        <h1 className="text-lg font-bold text-slate-800">Nhập số dư tài khoản ngân hàng</h1>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-600">
          TK {accountCode || '—'}
        </span>
        <Link to="/catalog/tai-khoan-ngan-hang" className="text-sm text-primary hover:underline">
          Danh mục Tài khoản ngân hàng
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
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-48 px-3 py-2">Số TK ngân&nbsp;hàng</th>
              <th className="px-3 py-2">Tên ngân&nbsp;hàng</th>
              <th className="w-28 px-3 py-2">Số tài&nbsp;khoản</th>
              <th className="w-48 px-3 py-2 text-right">Dư&nbsp;Nợ</th>
              <th className="w-48 px-3 py-2 text-right">Dư&nbsp;Có</th>
              <th className="w-24 px-3 py-2">Chức năng</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-red-500">
                  Lỗi tải dữ liệu.{' '}
                  <button className="underline" onClick={() => refetch()}>
                    Thử lại
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && pageRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-slate-400">
                  Chưa có số dư. Bấm “Nhập số dư” để chọn tài khoản ngân hàng và nhập số dư.
                </td>
              </tr>
            )}
            {pageRows.map((r) => (
              <tr key={r.bankAccountId} className="border-t border-border hover:bg-slate-50">
                <td className="px-3 py-1.5 tabular-nums text-slate-700">{r.accountNumber}</td>
                <td className="max-w-[360px] truncate px-3 py-1.5 text-slate-700">{r.bankName}</td>
                <td className="px-3 py-1.5 tabular-nums text-slate-700">{accountCode}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">
                  {r.debitAmount ? formatCurrency(r.debitAmount) : 0}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">
                  {r.creditAmount ? formatCurrency(r.creditAmount) : 0}
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
          {records.length > 0 && (
            <tfoot className="sticky bottom-0 border-t border-border bg-slate-50 font-semibold text-slate-800">
              <tr>
                <td colSpan={3} className="px-3 py-2">
                  Tổng
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(totals.debit)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(totals.credit)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
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

      {/* Modal sửa số dư 1 TK ngân hàng (như MISA) */}
      <Modal
        open={!!editing}
        onClose={cancelEdit}
        size="md"
        title="Số dư tài khoản ngân hàng"
      >
        {editing && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Số tài khoản</label>
              <input
                value={accountCode}
                disabled
                className="h-9 w-full rounded-md border border-border bg-slate-50 px-2 text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                Tài khoản ngân hàng
              </label>
              <input
                value={editing.accountNumber}
                disabled
                className="h-9 w-full rounded-md border border-border bg-slate-50 px-2 text-sm text-slate-500"
              />
              <p className="mt-1 text-sm text-slate-500">{editing.bankName}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Dư Nợ</label>
                <AmountInput
                  value={draft.debit}
                  onChange={(v) => setDraft((d) => ({ ...d, debit: v }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Dư Có</label>
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
                onClick={() => saveEdit(editing.bankAccountId)}
                disabled={save.isPending}
                className="h-9 rounded-md bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {save.isPending ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal thêm số dư: chọn TK ngân hàng (đã có trong danh mục) + nhập Dư Nợ/Dư Có */}
      <Modal open={addOpen} onClose={cancelAdd} size="md" title="Nhập số dư tài khoản ngân hàng">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Số tài khoản</label>
            <input
              value={accountCode}
              disabled
              className="h-9 w-full rounded-md border border-border bg-slate-50 px-2 text-sm text-slate-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Tài khoản ngân hàng
            </label>
            <Select value={addBankAccountId ?? ''} onValueChange={setAddBankAccountId}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Chọn tài khoản ngân hàng" />
              </SelectTrigger>
              <SelectContent>
                {addOptions.map((r) => (
                  <SelectItem key={r.bankAccountId} value={r.bankAccountId}>
                    {r.accountNumber} - {r.bankName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {addBankAccount && (
              <p className="mt-1 text-sm text-slate-500">{addBankAccount.bankName}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Dư Nợ</label>
              <AmountInput
                value={addDraft.debit}
                onChange={(v) => setAddDraft((d) => ({ ...d, debit: v }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Dư Có</label>
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
