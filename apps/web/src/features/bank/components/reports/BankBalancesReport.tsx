import type { BankBalanceFilter } from '@app/shared'
import { useBankBalances } from '../../api/useBankReports'
import { money, StatusRow, tdClass, tdMoney, thClass } from './report-utils'

const COL_SPAN = 5

// Bảng kê số dư ngân hàng: số dư từng TK ngân hàng tại ngày chọn + tổng cộng.
export function BankBalancesReport({ filter }: { filter: BankBalanceFilter }) {
  const { data, isLoading, isError } = useBankBalances(filter)
  const rows = data?.rows ?? []

  return (
    <table className="w-full min-w-[720px] border-collapse text-sm">
      <thead className="sticky top-0 z-10">
        <tr>
          <th className={`${thClass} w-12 text-center`}>STT</th>
          <th className={thClass}>Số tài khoản</th>
          <th className={thClass}>Ngân hàng</th>
          <th className={thClass}>Chi nhánh</th>
          <th className={thClass}>Số dư</th>
        </tr>
      </thead>
      <tbody>
        {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
        {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
        {data && rows.length === 0 && (
          <StatusRow colSpan={COL_SPAN}>Chưa có tài khoản ngân hàng nào.</StatusRow>
        )}
        {rows.map((r, i) => (
          <tr key={r.bankAccountNo || '(trống)'} className="hover:bg-slate-50">
            <td className={`${tdClass} text-center text-slate-500`}>{i + 1}</td>
            <td className={`${tdClass} whitespace-nowrap`}>
              {r.bankAccountNo || 'Chưa chọn TK ngân hàng'}
            </td>
            <td className={tdClass}>{r.bankName}</td>
            <td className={tdClass}>{r.bankBranch}</td>
            <td className={tdMoney}>{money(r.balance, true)}</td>
          </tr>
        ))}
        {data && rows.length > 0 && (
          <tr className="bg-slate-50 font-semibold">
            <td colSpan={4} className={tdClass}>Tổng cộng</td>
            <td className={tdMoney}>{money(data.totalBalance, true)}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
