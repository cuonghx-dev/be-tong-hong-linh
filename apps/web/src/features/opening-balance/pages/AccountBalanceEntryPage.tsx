import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useNavigateBack } from '@/shared/hooks/use-navigate-back'
import { cn } from '@/shared/lib/cn'
import { formatCurrency } from '@/shared/lib/currency'
import { SearchIcon } from '@/shared/ui/icons'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useToast } from '@/shared/ui/toast'
import { Input } from '@/shared/ui/input'
import { useAccountBalances } from '../api/useAccountBalances'
import { buildTree, detailBalanceLabel, type BalanceRow } from '../tree'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const PAGE_SIZES = [20, 50, 100]

// Màn "Nhập số dư tài khoản" — nhập số dư ở TK chi tiết (lá); TK cha tự cộng dồn (không hiện ở đây).
// Vào từ nút "Sửa" của trang Số dư tài khoản (?focus=<số TK> để cuộn tới đúng dòng).
export function AccountBalanceEntryPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const focus = params.get('focus')
  const { data, isLoading, isError, refetch } = useAccountBalances()
  const { toast } = useToast()
  const focusRef = useRef<HTMLTableRowElement>(null)

  const [rows, setRows] = useState<BalanceRow[]>([])
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    if (!data) return
    setRows(
      data.map((r) => ({
        accountCode: r.accountCode,
        accountName: r.accountName,
        debitAmount: Number(r.debitAmount),
        creditAmount: Number(r.creditAmount),
      })),
    )
  }, [data])

  const tree = useMemo(() => buildTree(rows), [rows])

  // Chỉ TK chi tiết (lá) mới nhập số dư — TK cha là tổng cộng dồn.
  const leaves = useMemo(
    () => tree.sorted.filter((r) => !tree.hasChildren(r.accountCode)),
    [tree],
  )

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return leaves
    return leaves.filter(
      (r) =>
        r.accountCode.toLowerCase().includes(q) || r.accountName.toLowerCase().includes(q),
    )
  }, [leaves, keyword])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pageCount)
  const pageRows = filtered.slice((current - 1) * pageSize, current * pageSize)

  // Tổng cộng toàn bộ TK chi tiết (2 vế cân khi số dư đúng).
  const totals = useMemo(() => {
    let debit = 0
    let credit = 0
    for (const r of leaves) {
      debit += r.debitAmount
      credit += r.creditAmount
    }
    return { debit, credit }
  }, [leaves])

  // Cuộn tới dòng TK vừa bấm "Sửa" ở trang trước.
  useEffect(() => {
    if (focus && focusRef.current) focusRef.current.scrollIntoView({ block: 'center' })
  }, [focus, pageRows])

  const close = useNavigateBack('/opening-balance/so-du-tai-khoan')

  const notReady = () => toast({ title: 'Màn nhập chi tiết đang phát triển.' })

  // Công nợ theo đối tượng (131 khách hàng, 331 nhà cung cấp) đã có màn nhập chi tiết.
  const openDetail = (code: string) => {
    if (code.startsWith('131') || code.startsWith('331')) {
      navigate(`/opening-balance/so-du-tai-khoan/cong-no?account=${encodeURIComponent(code)}`)
      return
    }
    notReady()
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold text-slate-800">Nhập số dư tài khoản</h1>
        <span className="text-sm text-slate-400">
          Nhập số dư ở tài khoản chi tiết; tài khoản tổng hợp tự cộng dồn.
        </span>
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
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Số tài&nbsp;khoản</TableHead>
              <TableHead>Tên tài&nbsp;khoản</TableHead>
              <TableHead className="w-44 text-right">Dư&nbsp;Nợ</TableHead>
              <TableHead className="w-44 text-right">Dư&nbsp;Có</TableHead>
              <TableHead className="w-64">Chi&nbsp;tiết số&nbsp;dư</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-slate-400">
                  Đang tải…
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-red-500">
                  Lỗi tải dữ liệu.{' '}
                  <button className="underline" onClick={() => refetch()}>
                    Thử lại
                  </button>
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-slate-400">
                  Không có tài khoản chi tiết nào.
                </TableCell>
              </TableRow>
            )}
            {pageRows.map((r) => {
              const isFocus = r.accountCode === focus
              return (
                <TableRow
                  key={r.accountCode}
                  ref={isFocus ? focusRef : undefined}
                  className={cn(
                    'border-t border-border hover:bg-slate-50',
                    isFocus && 'bg-primary/5',
                  )}
                >
                  <TableCell className="py-1.5 tabular-nums text-slate-700">{r.accountCode}</TableCell>
                  <TableCell className="max-w-[320px] truncate py-1.5 text-slate-700">
                    {r.accountName}
                  </TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums text-slate-700">
                    {r.debitAmount ? formatCurrency(r.debitAmount) : 0}
                  </TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums text-slate-700">
                    {r.creditAmount ? formatCurrency(r.creditAmount) : 0}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <button
                      onClick={() => openDetail(r.accountCode)}
                      className="text-primary hover:underline"
                    >
                      {detailBalanceLabel(r.accountCode)}
                    </button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          {filtered.length > 0 && (
            <TableFooter className="sticky bottom-0 font-semibold text-slate-800">
              <TableRow>
                <TableCell colSpan={2}>
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
      <div className="flex items-center border-t border-border bg-slate-900 px-4 py-2">
        <button
          onClick={close}
          className="h-9 rounded-md bg-white px-5 text-sm font-medium text-slate-800 hover:bg-slate-100"
        >
          Đóng
        </button>
      </div>
    </div>
  )
}
