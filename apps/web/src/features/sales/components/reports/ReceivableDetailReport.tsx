import type {
  CustomerReceivableDetailGroupDto,
  CustomerReceivableSource,
  SalesReportFilter,
} from '@app/shared'
import { useCustomerReceivableDetail } from '../../api/useSalesReports'
import { formatDate, money, StatusRow, tdClass, tdMoney, thClass } from './report-utils'

const COL_SPAN = 7

// Nhãn nguồn chứng từ của dòng công nợ.
const SOURCE_LABEL: Record<CustomerReceivableSource, string> = {
  SALES: 'Bán hàng',
  CASH: 'Thu tiền mặt',
  BANK: 'Thu tiền gửi',
  GENERAL: 'Nghiệp vụ khác',
}

// Chi tiết công nợ phải thu KH (TK 131): nhóm theo KH — dư đầu kỳ, từng chứng từ
// phát sinh (Nợ/Có + dư lũy kế), dư cuối kỳ; cuối bảng là tổng cộng mọi KH.
export function ReceivableDetailReport({ filter }: { filter: SalesReportFilter }) {
  const { data, isLoading, isError } = useCustomerReceivableDetail(filter)
  const groups = data?.groups ?? []

  return (
    <table className="w-full min-w-[1000px] border-collapse text-sm">
      <thead className="sticky top-0 z-10">
        <tr>
          <th className={thClass}>Ngày hạch toán</th>
          <th className={thClass}>Số chứng từ</th>
          <th className={thClass}>Loại chứng từ</th>
          <th className={thClass}>Diễn giải</th>
          <th className={thClass}>Phát sinh Nợ</th>
          <th className={thClass}>Phát sinh Có</th>
          <th className={thClass}>Dư Nợ</th>
        </tr>
      </thead>
      <tbody>
        {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
        {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
        {data && groups.length === 0 && (
          <StatusRow colSpan={COL_SPAN}>Không có công nợ trong kỳ.</StatusRow>
        )}
        {groups.map((g, gi) => (
          <GroupRows key={`${g.customerId ?? g.customerName}-${gi}`} group={g} />
        ))}
        {data && groups.length > 0 && (
          <tr className="bg-slate-100 font-semibold">
            <td colSpan={4} className={tdClass}>
              Tổng cộng (dư đầu {money(data.totalOpening, true)} → dư cuối{' '}
              {money(data.totalClosing, true)})
            </td>
            <td className={tdMoney}>{money(data.totalDebit, true)}</td>
            <td className={tdMoney}>{money(data.totalCredit, true)}</td>
            <td className={tdMoney}>{money(data.totalClosing, true)}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

function GroupRows({ group }: { group: CustomerReceivableDetailGroupDto }) {
  return (
    <>
      {/* Tên KH + dư đầu kỳ */}
      <tr className="bg-slate-50/80 font-medium">
        <td colSpan={6} className={tdClass}>
          {group.customerCode ? `${group.customerCode} — ` : ''}
          {group.customerName} · Số dư đầu kỳ
        </td>
        <td className={tdMoney}>{money(group.openingBalance, true)}</td>
      </tr>
      {group.rows.map((r, i) => (
        <tr key={`${r.voucherId}-${r.source}-${i}`} className="hover:bg-slate-50">
          <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.postingDate)}</td>
          <td className={`${tdClass} whitespace-nowrap`}>{r.voucherNo}</td>
          <td className={`${tdClass} whitespace-nowrap`}>{SOURCE_LABEL[r.source]}</td>
          <td className={`${tdClass} max-w-[320px] truncate`} title={r.description ?? ''}>
            {r.description}
          </td>
          <td className={tdMoney}>{money(r.debitAmount)}</td>
          <td className={tdMoney}>{money(r.creditAmount)}</td>
          <td className={tdMoney}>{money(r.balance, true)}</td>
        </tr>
      ))}
      {/* Cộng phát sinh + dư cuối kỳ của KH */}
      <tr className="bg-slate-50/80 font-medium">
        <td colSpan={4} className={tdClass}>Cộng phát sinh · Số dư cuối kỳ</td>
        <td className={tdMoney}>{money(group.debitAmount, true)}</td>
        <td className={tdMoney}>{money(group.creditAmount, true)}</td>
        <td className={tdMoney}>{money(group.closingBalance, true)}</td>
      </tr>
    </>
  )
}
