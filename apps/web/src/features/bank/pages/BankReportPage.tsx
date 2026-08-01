import type { BankReportFilter } from '@app/shared'
import { useParams, useSearchParams } from 'react-router-dom'
import { useBankAccounts } from '@/features/catalog'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { useNavigateBack } from '@/shared/hooks/use-navigate-back'
import { formatDate, monthRange, REPORT_PRESETS } from '@/shared/lib/report-period'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { BankBalancesReport } from '../components/reports/BankBalancesReport'
import { BankBookReport } from '../components/reports/BankBookReport'
import { BankDailyBalanceReport } from '../components/reports/BankDailyBalanceReport'
import { BANK_REPORTS, type BankReportSlug } from '../types'

// Trang xem báo cáo tiền gửi full-page (§5 design.md). Route: /bank/reports/:slug
// Bảng kê số dư ngân hàng chỉ dùng mốc "đến ngày"; sổ tiền gửi lọc thêm theo TKNH.
export function BankReportPage() {
  const close = useNavigateBack('/bank')
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()

  const report = BANK_REPORTS.find((r) => r.slug === slug)
  const defaultRange = monthRange(0)
  const fromDate = params.get('from') ?? defaultRange.from
  const toDate = params.get('to') ?? defaultRange.to
  const bankAccountNo = params.get('bank') ?? ''
  const balanceOnly = slug === 'account-balances'

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const setRange = (from: string, to: string) => {
    const next = new URLSearchParams(params)
    next.set('from', from)
    next.set('to', to)
    setParams(next, { replace: true })
  }

  const activePreset = REPORT_PRESETS.find((p) => {
    const r = p.range()
    return r.from === fromDate && r.to === toDate
  })?.key

  return (
    <RecordPageShell
      title={report?.name ?? 'Báo cáo'}
      subtitle={balanceOnly ? `Đến ngày ${formatDate(toDate)}` : `Kỳ ${formatDate(fromDate)} – ${formatDate(toDate)}`}
      onClose={close}
    >
      <div className="mx-auto flex h-full max-w-6xl flex-col gap-3">
        {/* Bộ lọc kỳ báo cáo */}
        <div className="flex flex-wrap items-center gap-2">
          {!balanceOnly && (
            <>
              <Select
                value={activePreset ?? 'custom'}
                onValueChange={(v) => {
                  const preset = REPORT_PRESETS.find((p) => p.key === v)
                  if (preset) {
                    const r = preset.range()
                    setRange(r.from, r.to)
                  }
                }}
              >
                <SelectTrigger className="h-8 w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_PRESETS.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" disabled={!!activePreset}>
                    Tùy chọn
                  </SelectItem>
                </SelectContent>
              </Select>
              <Label className="font-normal flex items-center gap-1.5 text-sm text-slate-600">
                Từ ngày
                <Input
                  type="date"
                  value={fromDate}
                  max={toDate}
                  onChange={(e) => e.target.value && setRange(e.target.value, toDate)}
                  className="h-8 w-auto px-2"
                />
              </Label>
            </>
          )}
          <Label className="font-normal flex items-center gap-1.5 text-sm text-slate-600">
            Đến ngày
            <Input
              type="date"
              value={toDate}
              min={balanceOnly ? undefined : fromDate}
              onChange={(e) =>
                e.target.value &&
                (balanceOnly ? setParam('to', e.target.value) : setRange(fromDate, e.target.value))
              }
              className="h-8 w-auto px-2"
            />
          </Label>
          {slug === 'bank-book' && (
            <Label className="font-normal flex items-center gap-1.5 text-sm text-slate-600">
              Tài khoản
              <BankAccountSelect value={bankAccountNo} onChange={(v) => setParam('bank', v)} />
            </Label>
          )}
        </div>

        {/* Bảng báo cáo — tự cuộn trong khung */}
        <div className="flex-1 overflow-auto rounded-lg border border-border bg-white">
          {renderReport(slug as BankReportSlug, {
            fromDate,
            toDate,
            bankAccountNo: bankAccountNo || undefined,
          })}
        </div>
      </div>
    </RecordPageShell>
  )
}

function renderReport(slug: BankReportSlug, filter: BankReportFilter) {
  switch (slug) {
    case 'bank-book':
      return <BankBookReport filter={filter} />
    case 'account-balances':
      return <BankBalancesReport filter={{ toDate: filter.toDate }} />
    case 'daily-balance':
      return <BankDailyBalanceReport filter={{ fromDate: filter.fromDate, toDate: filter.toDate }} />
    default:
      return <div className="px-3 py-10 text-center text-slate-400">Không tìm thấy báo cáo.</div>
  }
}

// Select TKNH từ danh mục (rỗng = tất cả).
function BankAccountSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data } = useBankAccounts({ page: 1, pageSize: 200 })
  return (
    <Select value={value || 'all'} onValueChange={(v) => onChange(v === 'all' ? '' : v)}>
      <SelectTrigger className="h-8 w-auto min-w-56 bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả tài khoản</SelectItem>
        {(data?.data ?? []).map((a) => (
          <SelectItem key={a.id} value={a.accountNumber}>
            {a.accountNumber} — {a.bankName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
