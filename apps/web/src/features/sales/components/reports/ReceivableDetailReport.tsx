import type {
  CustomerReceivableDetailGroupDto,
  CustomerReceivableSource,
  SalesReportFilter,
} from '@app/shared'
import { useCustomerReceivableDetail } from '../../api/useSalesReports'
import { formatDate, money, StatusRow, tdClass, tdMoney, thClass } from './report-utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

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
    <Table className="min-w-[1000px]">
      <TableHeader>
        <TableRow>
          <TableHead className={thClass}>Ngày hạch&nbsp;toán</TableHead>
          <TableHead className={thClass}>Số chứng&nbsp;từ</TableHead>
          <TableHead className={thClass}>Loại chứng&nbsp;từ</TableHead>
          <TableHead className={thClass}>Diễn&nbsp;giải</TableHead>
          <TableHead className={thClass}>Phát&nbsp;sinh Nợ</TableHead>
          <TableHead className={thClass}>Phát&nbsp;sinh Có</TableHead>
          <TableHead className={thClass}>Dư&nbsp;Nợ</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
        {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
        {data && groups.length === 0 && (
          <StatusRow colSpan={COL_SPAN}>Không có công nợ trong kỳ.</StatusRow>
        )}
        {groups.map((g, gi) => (
          <GroupRows key={`${g.customerId ?? g.customerName}-${gi}`} group={g} />
        ))}
        {data && groups.length > 0 && (
          <TableRow className="bg-slate-100 font-semibold">
            <TableCell colSpan={4} className={tdClass}>
              Tổng cộng (dư đầu {money(data.totalOpening, true)} → dư cuối{' '}
              {money(data.totalClosing, true)})
            </TableCell>
            <TableCell className={tdMoney}>{money(data.totalDebit, true)}</TableCell>
            <TableCell className={tdMoney}>{money(data.totalCredit, true)}</TableCell>
            <TableCell className={tdMoney}>{money(data.totalClosing, true)}</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

function GroupRows({ group }: { group: CustomerReceivableDetailGroupDto }) {
  return (
    <>
      {/* Tên KH + dư đầu kỳ */}
      <TableRow className="bg-slate-50/80 font-medium">
        <TableCell colSpan={6} className={tdClass}>
          {group.customerCode ? `${group.customerCode} — ` : ''}
          {group.customerName} · Số dư đầu kỳ
        </TableCell>
        <TableCell className={tdMoney}>{money(group.openingBalance, true)}</TableCell>
      </TableRow>
      {group.rows.map((r, i) => (
        <TableRow key={`${r.voucherId}-${r.source}-${i}`}>
          <TableCell className={`${tdClass} whitespace-nowrap`}>{formatDate(r.postingDate)}</TableCell>
          <TableCell className={`${tdClass} whitespace-nowrap`}>{r.voucherNo}</TableCell>
          <TableCell className={`${tdClass} whitespace-nowrap`}>{SOURCE_LABEL[r.source]}</TableCell>
          <TableCell className={`${tdClass} max-w-[320px] truncate`} title={r.description ?? ''}>
            {r.description}
          </TableCell>
          <TableCell className={tdMoney}>{money(r.debitAmount)}</TableCell>
          <TableCell className={tdMoney}>{money(r.creditAmount)}</TableCell>
          <TableCell className={tdMoney}>{money(r.balance, true)}</TableCell>
        </TableRow>
      ))}
      {/* Cộng phát sinh + dư cuối kỳ của KH */}
      <TableRow className="bg-slate-50/80 font-medium">
        <TableCell colSpan={4} className={tdClass}>Cộng phát sinh · Số dư cuối kỳ</TableCell>
        <TableCell className={tdMoney}>{money(group.debitAmount, true)}</TableCell>
        <TableCell className={tdMoney}>{money(group.creditAmount, true)}</TableCell>
        <TableCell className={tdMoney}>{money(group.closingBalance, true)}</TableCell>
      </TableRow>
    </>
  )
}
