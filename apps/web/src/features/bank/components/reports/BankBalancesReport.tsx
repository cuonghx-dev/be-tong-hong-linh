import type { BankBalanceFilter } from '@app/shared'
import { useBankBalances } from '../../api/useBankReports'
import { money } from '@/shared/lib/report-format'
import { StatusRow, tdClass, tdMoney, thClass } from '@/shared/ui/report-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const COL_SPAN = 5

// Bảng kê số dư ngân hàng: số dư từng TK ngân hàng tại ngày chọn + tổng cộng.
export function BankBalancesReport({ filter }: { filter: BankBalanceFilter }) {
  const { data, isLoading, isError } = useBankBalances(filter)
  const rows = data?.rows ?? []

  return (
    <Table className="min-w-[720px]">
      <TableHeader>
        <TableRow>
          <TableHead className={`${thClass} w-12 text-center`}>STT</TableHead>
          <TableHead className={thClass}>Số tài&nbsp;khoản</TableHead>
          <TableHead className={thClass}>Ngân&nbsp;hàng</TableHead>
          <TableHead className={thClass}>Chi&nbsp;nhánh</TableHead>
          <TableHead className={thClass}>Số&nbsp;dư</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
        {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
        {data && rows.length === 0 && (
          <StatusRow colSpan={COL_SPAN}>Chưa có tài khoản ngân hàng nào.</StatusRow>
        )}
        {rows.map((r, i) => (
          <TableRow key={r.bankAccountNo || '(trống)'}>
            <TableCell className={`${tdClass} text-center text-slate-500`}>{i + 1}</TableCell>
            <TableCell className={`${tdClass} whitespace-nowrap`}>
              {r.bankAccountNo || 'Chưa chọn TK ngân hàng'}
            </TableCell>
            <TableCell className={tdClass}>{r.bankName}</TableCell>
            <TableCell className={tdClass}>{r.bankBranch}</TableCell>
            <TableCell className={tdMoney}>{money(r.balance, true)}</TableCell>
          </TableRow>
        ))}
        {data && rows.length > 0 && (
          <TableRow className="bg-slate-50 font-semibold">
            <TableCell colSpan={4} className={tdClass}>Tổng cộng</TableCell>
            <TableCell className={tdMoney}>{money(data.totalBalance, true)}</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
