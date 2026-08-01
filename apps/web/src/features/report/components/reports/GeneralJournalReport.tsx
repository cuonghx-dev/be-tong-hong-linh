import type { GeneralJournalFilter } from '@app/shared'
import { useSearchParams } from 'react-router-dom'
import { useGeneralJournal } from '../../api/useGeneralReports'
import { formatDate, money, periodLabel, StatusRow, tdClass, tdMoney, thClass } from './report-utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const PAGE_SIZE = 20

// S03a-DNN: Sổ nhật ký chung — mỗi chứng từ gộp nhóm (rowSpan cột ngày/số CT),
// mỗi bút toán 2 dòng: vế Nợ rồi vế Có. Phân trang theo chứng từ trên server.
export function GeneralJournalReport({ filter }: { filter: GeneralJournalFilter }) {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page') ?? 1))
  const { data, isLoading, isError } = useGeneralJournal({ ...filter, page, pageSize: PAGE_SIZE })

  const vouchers = data?.vouchers ?? []
  const totalVouchers = data?.totalVouchers ?? 0
  const pageCount = Math.max(1, Math.ceil(totalVouchers / PAGE_SIZE))
  const setPage = (p: number) => {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    setParams(next, { replace: true })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">
        {/* Tiêu đề sổ + kỳ báo cáo (giữa trang, như mẫu in) */}
        <div className="py-4 text-center">
          <div className="text-lg font-bold uppercase text-slate-800">Sổ nhật ký chung</div>
          <div className="text-sm italic text-slate-500">{periodLabel(filter)}</div>
        </div>

        <Table className="min-w-[960px]">
          <TableHeader>
            <TableRow>
              <TableHead rowSpan={2} className={thClass}>Ngày, tháng ghi&nbsp;sổ</TableHead>
              <TableHead colSpan={2} className={`${thClass} text-center`}>Chứng&nbsp;từ</TableHead>
              <TableHead rowSpan={2} className={thClass}>Diễn&nbsp;giải</TableHead>
              <TableHead rowSpan={2} className={thClass}>Số&nbsp;hiệu TK</TableHead>
              <TableHead colSpan={2} className={`${thClass} text-center`}>Số phát&nbsp;sinh</TableHead>
            </TableRow>
            <TableRow>
              <TableHead className={thClass}>Số&nbsp;hiệu</TableHead>
              <TableHead className={thClass}>Ngày&nbsp;tháng</TableHead>
              <TableHead className={`${thClass} text-right`}>Nợ</TableHead>
              <TableHead className={`${thClass} text-right`}>Có</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <StatusRow colSpan={7}>Đang tải…</StatusRow>}
            {isError && <StatusRow colSpan={7}>Lỗi tải dữ liệu.</StatusRow>}
            {!isLoading && !isError && vouchers.length === 0 && (
              <StatusRow colSpan={7}>Không có phát sinh trong kỳ.</StatusRow>
            )}
            {vouchers.map((v) =>
              v.rows.map((r, i) => (
                <TableRow key={`${v.voucherKind}-${v.voucherNo}-${i}`}>
                  {i === 0 && (
                    <>
                      <TableCell rowSpan={v.rows.length} className={`${tdClass} whitespace-nowrap align-top`}>
                        {formatDate(v.postingDate)}
                      </TableCell>
                      <TableCell
                        rowSpan={v.rows.length}
                        className={`${tdClass} whitespace-nowrap align-top`}
                        title={v.voucherKind}
                      >
                        {v.voucherNo}
                      </TableCell>
                      <TableCell rowSpan={v.rows.length} className={`${tdClass} whitespace-nowrap align-top`}>
                        {formatDate(v.voucherDate)}
                      </TableCell>
                    </>
                  )}
                  <TableCell
                    className={`${tdClass} max-w-[360px] truncate ${r.description ? '' : 'text-slate-400'}`}
                    title={r.description ?? ''}
                  >
                    {r.description}
                  </TableCell>
                  {/* Vế Có thụt lề theo mẫu in S03a */}
                  <TableCell className={`${tdClass} whitespace-nowrap ${Number(r.creditAmount) > 0 ? 'pl-8' : ''}`}>
                    {r.account}
                  </TableCell>
                  <TableCell className={tdMoney}>{money(r.debitAmount)}</TableCell>
                  <TableCell className={tdMoney}>{money(r.creditAmount)}</TableCell>
                </TableRow>
              )),
            )}
            {vouchers.length > 0 && (
              <TableRow className="bg-slate-50 font-semibold">
                <TableCell colSpan={5} className={tdClass}>Tổng cộng toàn kỳ</TableCell>
                <TableCell className={tdMoney}>{money(data?.totalDebit ?? '0', true)}</TableCell>
                <TableCell className={tdMoney}>{money(data?.totalCredit ?? '0', true)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer phân trang — theo pattern bảng danh sách (§3) */}
      <div className="flex items-center border-t border-border px-3 py-2 text-sm text-slate-500">
        <span>
          Tổng số: <b className="text-slate-700">{totalVouchers}</b> chứng từ
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span>{PAGE_SIZE} chứng từ trên 1 trang</span>
          <div className="flex items-center gap-1">
            <button
              className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Trước
            </button>
            <span className="px-2 py-1 text-slate-700">
              {page} / {pageCount}
            </span>
            <button
              className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
              disabled={page >= pageCount}
              onClick={() => setPage(page + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
