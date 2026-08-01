import type { CashReportFilter } from '@app/shared'
import { useParams, useSearchParams } from 'react-router-dom'
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
import { CashBookReport } from '../components/reports/CashBookReport'
import { CashJournalReport } from '../components/reports/CashJournalReport'
import { DailyBalanceReport } from '../components/reports/DailyBalanceReport'
import { CASH_REPORTS, type CashReportSlug } from '../types'

// Trang xem báo cáo tiền mặt full-page (§5 design.md). Route: /cash/reports/:slug
export function CashReportPage() {
  const close = useNavigateBack('/cash')
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()

  const report = CASH_REPORTS.find((r) => r.slug === slug)
  const defaultRange = monthRange(0)
  const fromDate = params.get('from') ?? defaultRange.from
  const toDate = params.get('to') ?? defaultRange.to
  const filter: CashReportFilter = { fromDate, toDate }

  const setRange = (from: string, to: string) => {
    const next = new URLSearchParams(params)
    next.set('from', from)
    next.set('to', to)
    next.delete('page') // đổi kỳ → về trang 1
    setParams(next, { replace: true })
  }

  const activePreset = REPORT_PRESETS.find((p) => {
    const r = p.range()
    return r.from === fromDate && r.to === toDate
  })?.key

  return (
    <RecordPageShell
      title={report?.name ?? 'Báo cáo'}
      subtitle={`Kỳ ${formatDate(fromDate)} – ${formatDate(toDate)}`}
      onClose={close}
    >
      <div className="mx-auto flex h-full max-w-6xl flex-col gap-3">
        {/* Bộ lọc kỳ báo cáo */}
        <div className="flex flex-wrap items-center gap-2">
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
          <Label className="font-normal flex items-center gap-1.5 text-sm text-slate-600">
            Đến ngày
            <Input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => e.target.value && setRange(fromDate, e.target.value)}
              className="h-8 w-auto px-2"
            />
          </Label>
        </div>

        {/* Bảng báo cáo — tự cuộn trong khung */}
        <div className="flex-1 overflow-auto rounded-lg border border-border bg-white">
          {renderReport(slug as CashReportSlug, filter)}
        </div>
      </div>
    </RecordPageShell>
  )
}

function renderReport(slug: CashReportSlug, filter: CashReportFilter) {
  switch (slug) {
    case 'receipt-journal':
      return <CashJournalReport kind="receipt" filter={filter} />
    case 'payment-journal':
      return <CashJournalReport kind="payment" filter={filter} />
    case 'cash-book':
      return <CashBookReport filter={filter} />
    case 'daily-balance':
      return <DailyBalanceReport filter={filter} />
    default:
      return <div className="px-3 py-10 text-center text-slate-400">Không tìm thấy báo cáo.</div>
  }
}
