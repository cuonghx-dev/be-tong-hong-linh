import type { CashReportFilter } from '@app/shared'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { CashBookReport } from '../components/reports/CashBookReport'
import { CashJournalReport } from '../components/reports/CashJournalReport'
import { DailyBalanceReport } from '../components/reports/DailyBalanceReport'
import { CASH_REPORTS, type CashReportSlug } from '../types'

// Preset kỳ báo cáo — chọn preset ghi from/to vào URL params (share link được).
const PRESETS: { key: string; label: string; range: () => { from: string; to: string } }[] = [
  { key: 'month', label: 'Tháng này', range: () => monthRange(0) },
  { key: 'prev-month', label: 'Tháng trước', range: () => monthRange(-1) },
  { key: 'quarter', label: 'Quý này', range: quarterRange },
  { key: 'year', label: 'Năm nay', range: yearRange },
]

// Trang xem báo cáo tiền mặt full-page (§5 design.md). Route: /cash/reports/:slug
export function CashReportPage() {
  const navigate = useNavigate()
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

  const activePreset = PRESETS.find((p) => {
    const r = p.range()
    return r.from === fromDate && r.to === toDate
  })?.key

  return (
    <RecordPageShell
      title={report?.name ?? 'Báo cáo'}
      subtitle={`Kỳ ${formatDate(fromDate)} – ${formatDate(toDate)}`}
      onClose={() => navigate('/cash')}
    >
      <div className="mx-auto flex h-full max-w-6xl flex-col gap-3">
        {/* Bộ lọc kỳ báo cáo */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activePreset ?? 'custom'}
            onChange={(e) => {
              const preset = PRESETS.find((p) => p.key === e.target.value)
              if (preset) {
                const r = preset.range()
                setRange(r.from, r.to)
              }
            }}
            className="h-8 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
            <option value="custom" disabled={!!activePreset}>
              Tùy chọn
            </option>
          </select>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            Từ ngày
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => e.target.value && setRange(e.target.value, toDate)}
              className="h-8 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            Đến ngày
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => e.target.value && setRange(fromDate, e.target.value)}
              className="h-8 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
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

// ── Helpers kỳ báo cáo (giờ địa phương, format yyyy-mm-dd) ────────────────────

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// offset: 0 = tháng này, -1 = tháng trước.
function monthRange(offset: number): { from: string; to: string } {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return {
    from: iso(first.getFullYear(), first.getMonth(), 1),
    to: iso(last.getFullYear(), last.getMonth(), last.getDate()),
  }
}

function quarterRange(): { from: string; to: string } {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3)
  const last = new Date(now.getFullYear(), q * 3 + 3, 0)
  return {
    from: iso(now.getFullYear(), q * 3, 1),
    to: iso(now.getFullYear(), last.getMonth(), last.getDate()),
  }
}

function yearRange(): { from: string; to: string } {
  const y = new Date().getFullYear()
  return { from: iso(y, 0, 1), to: iso(y, 11, 31) }
}

function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return d && m && y ? `${d}/${m}/${y}` : isoDate
}
