import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAccounts } from '@/features/catalog'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { formatDate, monthRange, REPORT_PRESETS } from '@/shared/lib/report-period'
import { AccountLedgerReport } from '../components/reports/AccountLedgerReport'
import { GeneralJournalReport } from '../components/reports/GeneralJournalReport'
import { GENERAL_REPORTS, type GeneralReportSlug } from '../types'

const inputClass =
  'h-8 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

// Trang xem báo cáo Tổng hợp full-page (§5 design.md). Route: /general/reports/:slug
// Sổ chi tiết các tài khoản lọc thêm được theo 1 TK (khớp tiền tố: 131 gồm 1311…).
export function GeneralReportPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()

  const report = GENERAL_REPORTS.find((r) => r.slug === slug)
  const defaultRange = monthRange(0)
  const fromDate = params.get('from') ?? defaultRange.from
  const toDate = params.get('to') ?? defaultRange.to
  const accountCode = params.get('account') ?? ''

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page') // đổi bộ lọc → về trang 1
    setParams(next, { replace: true })
  }

  const setRange = (from: string, to: string) => {
    const next = new URLSearchParams(params)
    next.set('from', from)
    next.set('to', to)
    next.delete('page')
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
      onClose={() => navigate('/general')}
    >
      <div className="mx-auto flex h-full max-w-6xl flex-col gap-3">
        {/* Bộ lọc kỳ báo cáo */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activePreset ?? 'custom'}
            onChange={(e) => {
              const preset = REPORT_PRESETS.find((p) => p.key === e.target.value)
              if (preset) {
                const r = preset.range()
                setRange(r.from, r.to)
              }
            }}
            className={inputClass}
          >
            {REPORT_PRESETS.map((p) => (
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
              className={inputClass}
            />
          </label>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            Đến ngày
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => e.target.value && setRange(fromDate, e.target.value)}
              className={inputClass}
            />
          </label>
          {slug === 'account-ledger' && (
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              Tài khoản
              <AccountSelect value={accountCode} onChange={(v) => setParam('account', v)} />
            </label>
          )}
        </div>

        {/* Bảng báo cáo — tự cuộn trong khung */}
        <div className="flex-1 overflow-auto rounded-lg border border-border bg-white">
          {renderReport(slug as GeneralReportSlug, fromDate, toDate, accountCode)}
        </div>
      </div>
    </RecordPageShell>
  )
}

function renderReport(
  slug: GeneralReportSlug,
  fromDate: string,
  toDate: string,
  accountCode: string,
) {
  switch (slug) {
    case 'general-journal':
      return <GeneralJournalReport filter={{ fromDate, toDate }} />
    case 'account-ledger':
      return (
        <AccountLedgerReport
          filter={{ fromDate, toDate, accountCode: accountCode || undefined }}
        />
      )
    default:
      return <div className="px-3 py-10 text-center text-slate-400">Không tìm thấy báo cáo.</div>
  }
}

// Select TK từ danh mục hệ thống tài khoản (rỗng = tất cả TK có phát sinh).
function AccountSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data } = useAccounts({ page: 1, pageSize: 500 })
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} min-w-56 bg-white`}
    >
      <option value="">Tất cả tài khoản</option>
      {(data?.data ?? []).map((a) => (
        <option key={a.id} value={a.number}>
          {a.number} — {a.name}
        </option>
      ))}
    </select>
  )
}
