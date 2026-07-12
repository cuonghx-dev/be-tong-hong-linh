import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { formatCurrency } from '@/shared/lib/currency'
import { SearchIcon } from '@/shared/ui/icons'
import { Modal } from '@/shared/ui/modal'
import { useToast } from '@/shared/ui/toast'
import { AmountInput } from '../components/AmountInput'
import { usePartnerBalances } from '../api/usePartnerBalances'
import { useSavePartnerBalances } from '../api/usePartnerBalanceMutations'

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
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const accountCode = params.get('account') ?? ''
  const labels = partnerLabels(accountCode)

  const { data, isLoading, isError, refetch } = usePartnerBalances(accountCode)
  const save = useSavePartnerBalances()
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

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.partnerCode.toLowerCase().includes(q) || r.partnerName.toLowerCase().includes(q),
    )
  }, [rows, keyword])

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

  const close = () => navigate('/opening-balance/so-du-tai-khoan')

  const startEdit = (r: EditRow) => {
    setEditing(r)
    setDraft({ debit: r.debitAmount, credit: r.creditAmount })
  }
  const cancelEdit = () => setEditing(null)

  // Lưu dòng đang sửa → cập nhật rows rồi ghi cả bảng (backend thay thế dữ liệu cũ của TK).
  const saveEdit = (partnerId: string) => {
    const next = rows.map((r) =>
      r.partnerId === partnerId
        ? { ...r, debitAmount: draft.debit, creditAmount: draft.credit }
        : r,
    )
    setRows(next)
    setEditing(null)
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
      <div className="border-b border-border px-4 py-2">
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
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-28 px-3 py-2">Số tài khoản</th>
              <th className="w-48 px-3 py-2">{labels.code}</th>
              <th className="px-3 py-2">{labels.name}</th>
              <th className="w-48 px-3 py-2 text-right">Dư Nợ</th>
              <th className="w-48 px-3 py-2 text-right">Dư Có</th>
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
                  Không có đối tượng nào. Thêm ở danh mục trước khi nhập số dư.
                </td>
              </tr>
            )}
            {pageRows.map((r) => (
              <tr key={r.partnerId} className="border-t border-border hover:bg-slate-50">
                <td className="px-3 py-1.5 tabular-nums text-slate-700">{accountCode}</td>
                <td className="px-3 py-1.5 text-slate-700">{r.partnerCode}</td>
                <td className="max-w-[360px] truncate px-3 py-1.5 text-slate-700">
                  {r.partnerName}
                </td>
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
          {rows.length > 0 && (
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
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="h-8 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} bản ghi trên 1 trang
              </option>
            ))}
          </select>
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
              <label className="mb-1 block text-sm font-medium text-slate-600">Số tài khoản</label>
              <input
                value={accountCode}
                disabled
                className="h-9 w-full rounded-md border border-border bg-slate-50 px-2 text-sm text-slate-500"
              />
            </div>
            <div className="grid grid-cols-[1fr_auto_auto] items-end gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">
                  {labels.partnerField}
                </label>
                <input
                  value={editing.partnerName}
                  disabled
                  className="h-9 w-full rounded-md border border-border bg-slate-50 px-2 text-sm text-slate-500"
                />
              </div>
              <div className="w-48">
                <label className="mb-1 block text-sm font-medium text-slate-600">Dư Nợ</label>
                <AmountInput
                  value={draft.debit}
                  onChange={(v) => setDraft((d) => ({ ...d, debit: v }))}
                />
              </div>
              <div className="w-48">
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
    </div>
  )
}
