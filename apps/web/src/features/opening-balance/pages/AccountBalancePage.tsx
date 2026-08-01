import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { formatCurrency } from '@/shared/lib/currency'
import { AddMenu } from '@/shared/ui/add-menu'
import {
  ChevronLeftIcon,
  MinusSquareIcon,
  PlusSquareIcon,
  RefreshIcon,
} from '@/shared/ui/icons'
import { Modal } from '@/shared/ui/modal'
import { useToast } from '@/shared/ui/toast'
import { useAccountBalances } from '../api/useAccountBalances'
import {
  useImportAccountBalances,
  useSaveAccountBalances,
} from '../api/useAccountBalanceMutations'
import { AccountBalanceForm, type BalanceFormValue } from '../components/AccountBalanceForm'
import { buildTree, toSaveItems, type BalanceRow } from '../tree'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

// Bảng Số dư tài khoản đầu kỳ — cây cộng dồn cha-con. "Sửa" mở màn nhập số dư chi tiết (như MISA).
export function AccountBalancePage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch, isFetching } = useAccountBalances()
  const save = useSaveAccountBalances()
  const importXlsx = useImportAccountBalances()
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const [rows, setRows] = useState<BalanceRow[]>([])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [addOpen, setAddOpen] = useState(false)

  // Bấm "Sửa" ở 1 TK chi tiết → nhảy sang màn nhập số dư tương ứng loại TK.
  // TK tiền gửi (112x) vào thẳng màn "Nhập số dư tài khoản ngân hàng"; công nợ (131/331) vào thẳng
  // màn "Nhập số dư công nợ" theo đối tượng; còn lại qua màn nhập chung.
  const goEdit = (code: string) => {
    if (code.startsWith('112'))
      return navigate(
        `/opening-balance/so-du-tai-khoan/ngan-hang?account=${encodeURIComponent(code)}`,
      )
    if (code.startsWith('131') || code.startsWith('331'))
      return navigate(
        `/opening-balance/so-du-tai-khoan/cong-no?account=${encodeURIComponent(code)}`,
      )
    navigate(`/opening-balance/so-du-tai-khoan/nhap?focus=${encodeURIComponent(code)}`)
  }

  // Đồng bộ lại bảng mỗi khi server trả dữ liệu mới (sau load / save / import).
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

  // Trải phẳng cây theo thứ tự số TK, bỏ dòng có tổ tiên đang thu gọn.
  const visible = useMemo(
    () =>
      tree.sorted
        .map((row) => {
          const anc = tree.ancestors(row.accountCode)
          return {
            row,
            depth: anc.length,
            hasChildren: tree.hasChildren(row.accountCode),
            hidden: anc.some((a) => collapsed.has(a)),
          }
        })
        .filter((r) => !r.hidden),
    [tree, collapsed],
  )

  // Tổng chỉ cộng TK gốc (không có cha) để không đếm trùng con.
  const totals = useMemo(() => {
    let debit = 0
    let credit = 0
    for (const c of tree.codes) {
      if (tree.ancestors(c).length === 0) {
        const s = tree.rollup(c)
        debit += s.debit
        credit += s.credit
      }
    }
    return { debit, credit }
  }, [tree])

  // Lưu cả bảng sau mỗi thao tác (thêm/sửa/xóa) — backend thay thế toàn bộ dữ liệu cũ.
  const persist = (next: BalanceRow[], successTitle: string) => {
    setRows(next)
    save.mutate(
      { items: toSaveItems(next) },
      {
        onSuccess: () => toast({ variant: 'success', title: successTitle }),
        onError: () =>
          toast({
            variant: 'error',
            title: 'Lưu thất bại',
            description: 'Kiểm tra lại dữ liệu.',
          }),
      },
    )
  }

  const toggleCollapse = (code: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })

  const onSubmitForm = (value: BalanceFormValue) => {
    setAddOpen(false)
    persist([...rows, value], 'Đã thêm tài khoản')
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
          description: `${r.created} tài khoản mới, bỏ qua ${r.skipped} trùng (tổng ${r.total}).`,
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
      <h1 className="mt-2 text-2xl font-bold text-slate-800">Số dư tài khoản</h1>

      <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-white">
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
              actions={[{ label: 'Thêm tài khoản', onClick: () => setAddOpen(true) }]}
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
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Số tài&nbsp;khoản</TableHead>
                <TableHead>Tên tài&nbsp;khoản</TableHead>
                <TableHead className="w-44 text-right">Dư&nbsp;Nợ</TableHead>
                <TableHead className="w-44 text-right">Dư&nbsp;Có</TableHead>
                <TableHead className="sticky right-0 z-30 bg-slate-50 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
                  Chức&nbsp;năng
                </TableHead>
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
              {!isLoading && !isError && visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-slate-400">
                    Chưa có số dư tài khoản. Thêm tài khoản hoặc nhập khẩu từ Excel.
                  </TableCell>
                </TableRow>
              )}
              {visible.map(({ row: r, depth, hasChildren }) => {
                const disp = hasChildren
                  ? tree.rollup(r.accountCode)
                  : { debit: r.debitAmount, credit: r.creditAmount }
                return (
                  <TableRow
                    key={r.accountCode}
                    className="group"
                  >
                    <TableCell className="py-1.5">
                      <div
                        className="flex items-center gap-1"
                        style={{ paddingLeft: `${depth * 20}px` }}
                      >
                        {hasChildren ? (
                          <button
                            onClick={() => toggleCollapse(r.accountCode)}
                            className="grid h-4 w-4 shrink-0 place-items-center text-slate-400 hover:text-slate-600"
                            aria-label={collapsed.has(r.accountCode) ? 'Mở rộng' : 'Thu gọn'}
                          >
                            {collapsed.has(r.accountCode) ? (
                              <PlusSquareIcon size={14} />
                            ) : (
                              <MinusSquareIcon size={14} />
                            )}
                          </button>
                        ) : (
                          <span className="h-4 w-4 shrink-0" />
                        )}
                        {hasChildren ? (
                          // TK tổng hợp: chỉ hiển thị, không cho nhập số dư (số cộng dồn từ con).
                          <span className="font-semibold tabular-nums text-slate-800">
                            {r.accountCode}
                          </span>
                        ) : (
                          <button
                            className="tabular-nums text-primary hover:underline"
                            onClick={() => goEdit(r.accountCode)}
                          >
                            {r.accountCode}
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'max-w-[320px] truncate px-3 py-1.5 text-slate-700',
                        hasChildren && 'font-semibold',
                      )}
                    >
                      {r.accountName}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'px-3 py-1.5 text-right tabular-nums text-slate-700',
                        hasChildren && 'font-semibold',
                      )}
                    >
                      {disp.debit ? formatCurrency(disp.debit) : 0}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'px-3 py-1.5 text-right tabular-nums text-slate-700',
                        hasChildren && 'font-semibold',
                      )}
                    >
                      {disp.credit ? formatCurrency(disp.credit) : 0}
                    </TableCell>
                    <TableCell className="sticky right-0 z-10 bg-white py-1.5 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50">
                      {/* TK tổng hợp không có hành động; chỉ TK chi tiết mới "Sửa" số dư. */}
                      {!hasChildren && (
                        <button
                          onClick={() => goEdit(r.accountCode)}
                          className="font-medium text-primary hover:underline"
                        >
                          Sửa
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
            {visible.length > 0 && (
              <TableFooter className="sticky bottom-0 font-semibold text-slate-800">
                <TableRow>
                  <TableCell colSpan={2}>
                    Tổng cộng
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(totals.debit)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(totals.credit)}</TableCell>
                  <TableCell className="sticky right-0 bg-slate-50" />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>

        {/* Footer */}
        <div className="flex items-center border-t border-border px-3 py-2 text-sm text-slate-500">
          <span>
            Tổng số: <b className="text-slate-700">{tree.codes.length}</b> tài khoản
          </span>
          {totals.debit !== totals.credit && (
            <span className="ml-4 text-amber-600">
              Lệch Nợ/Có: {formatCurrency(Math.abs(totals.debit - totals.credit))}
            </span>
          )}
        </div>
      </div>

      {/* Modal thêm tài khoản mới (sửa số dư đi qua màn "Nhập số dư tài khoản"). */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        size="lg"
        title="Thêm số dư tài khoản"
      >
        {addOpen && (
          <AccountBalanceForm
            existingCodes={tree.codes}
            onSubmit={onSubmitForm}
            onCancel={() => setAddOpen(false)}
          />
        )}
      </Modal>
    </div>
  )
}
