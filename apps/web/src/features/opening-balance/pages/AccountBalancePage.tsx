import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '@/shared/lib/currency'
import { AddMenu } from '@/shared/ui/add-menu'
import { useConfirm } from '@/shared/ui/confirm-dialog'
import { ChevronLeftIcon, RefreshIcon } from '@/shared/ui/icons'
import { useToast } from '@/shared/ui/toast'
import { useAccountBalances } from '../api/useAccountBalances'
import {
  useImportAccountBalances,
  useSaveAccountBalances,
} from '../api/useAccountBalanceMutations'
import { AmountInput } from '../components/AmountInput'

// 1 dòng đang soạn trên bảng (state cục bộ, chưa lưu).
interface BalanceRow {
  key: string
  accountCode: string
  accountName: string
  debitAmount: number
  creditAmount: number
}

let rowSeq = 0
const nextKey = () => `row-${++rowSeq}`

// TK cấp 1 (3 số) in đậm; TK con thụt lề theo độ sâu — như danh sách MISA.
const isTopLevel = (code: string) => code.trim().length <= 3

// Bảng Số dư tài khoản đầu kỳ — cột theo misa-specs/Danh_sach_so_du_tai_khoan.xlsx.
// Sửa trực tiếp trên bảng, "Cất" lưu cả bảng (thay thế dữ liệu cũ).
export function AccountBalancePage() {
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useAccountBalances()
  const save = useSaveAccountBalances()
  const importXlsx = useImportAccountBalances()
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const confirm = useConfirm()

  const [rows, setRows] = useState<BalanceRow[]>([])

  // Đồng bộ lại bảng mỗi khi server trả dữ liệu mới (sau load / save / import).
  useEffect(() => {
    if (!data) return
    setRows(
      data.map((r) => ({
        key: nextKey(),
        accountCode: r.accountCode,
        accountName: r.accountName,
        debitAmount: Number(r.debitAmount),
        creditAmount: Number(r.creditAmount),
      })),
    )
  }, [data, dataUpdatedAt])

  const patchRow = (key: string, patch: Partial<BalanceRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { key: nextKey(), accountCode: '', accountName: '', debitAmount: 0, creditAmount: 0 },
    ])
  }

  const removeRow = async (row: BalanceRow) => {
    const ok = await confirm({
      title: `Xóa dòng TK ${row.accountCode || '(trống)'}?`,
      description: 'Dòng sẽ mất khi bấm Cất.',
      confirmText: 'Xóa',
      destructive: true,
    })
    if (ok) setRows((prev) => prev.filter((r) => r.key !== row.key))
  }

  const onSave = () => {
    const items = rows
      .filter((r) => r.accountCode.trim() !== '')
      .map((r) => ({
        accountCode: r.accountCode.trim(),
        accountName: r.accountName.trim(),
        debitAmount: r.debitAmount,
        creditAmount: r.creditAmount,
      }))
    save.mutate(
      { items },
      {
        onSuccess: () =>
          toast({ variant: 'success', title: 'Đã lưu số dư tài khoản' }),
        onError: () =>
          toast({
            variant: 'error',
            title: 'Lưu thất bại',
            description: 'Kiểm tra lại dữ liệu trên bảng.',
          }),
      },
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

  // Tổng chỉ cộng TK cấp 1 để không đếm trùng TK con (con là chi tiết của cha).
  const totalDebit = rows.filter((r) => isTopLevel(r.accountCode)).reduce((s, r) => s + r.debitAmount, 0)
  const totalCredit = rows.filter((r) => isTopLevel(r.accountCode)).reduce((s, r) => s + r.creditAmount, 0)

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
              actions={[{ label: 'Thêm dòng tài khoản', onClick: addRow }]}
              onImportExcel={() => fileRef.current?.click()}
              importing={importXlsx.isPending}
            />
            <button
              onClick={onSave}
              disabled={save.isPending}
              className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {save.isPending ? 'Đang lưu…' : 'Cất'}
            </button>
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
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-12 px-3 py-2 text-center">STT</th>
                <th className="w-36 px-3 py-2">Số tài khoản</th>
                <th className="px-3 py-2">Tên tài khoản</th>
                <th className="w-44 px-3 py-2 text-right">Dư Nợ</th>
                <th className="w-44 px-3 py-2 text-right">Dư Có</th>
                <th className="w-16 px-3 py-2" />
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
              {!isLoading && !isError && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-slate-400">
                    Chưa có số dư tài khoản. Thêm dòng hoặc nhập khẩu từ Excel.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => {
                const depth = Math.max(0, r.accountCode.trim().length - 3)
                return (
                  <tr key={r.key} className="border-t border-border hover:bg-slate-50">
                    <td className="px-3 py-1.5 text-center text-slate-500">{i + 1}</td>
                    <td className="px-3 py-1.5">
                      <input
                        value={r.accountCode}
                        onChange={(e) => patchRow(r.key, { accountCode: e.target.value })}
                        placeholder="Số TK"
                        className="h-8 w-full rounded-md border border-border px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        value={r.accountName}
                        onChange={(e) => patchRow(r.key, { accountName: e.target.value })}
                        placeholder="Tên tài khoản"
                        style={{ paddingLeft: 8 + depth * 16 }}
                        className={`h-8 w-full rounded-md border border-border pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                          isTopLevel(r.accountCode) ? 'font-semibold text-slate-800' : 'text-slate-700'
                        }`}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <AmountInput
                        value={r.debitAmount}
                        onChange={(v) => patchRow(r.key, { debitAmount: v })}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <AmountInput
                        value={r.creditAmount}
                        onChange={(v) => patchRow(r.key, { creditAmount: v })}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <button
                        onClick={() => removeRow(r)}
                        className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="sticky bottom-0 border-t border-border bg-slate-50 font-semibold text-slate-800">
                <tr>
                  <td colSpan={3} className="px-3 py-2">
                    Tổng cộng (TK cấp 1)
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(totalDebit)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(totalCredit)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center border-t border-border px-3 py-2 text-sm text-slate-500">
          <span>
            Tổng số: <b className="text-slate-700">{rows.length}</b> tài khoản
          </span>
          {totalDebit !== totalCredit && (
            <span className="ml-4 text-amber-600">
              Lệch Nợ/Có: {formatCurrency(Math.abs(totalDebit - totalCredit))}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
