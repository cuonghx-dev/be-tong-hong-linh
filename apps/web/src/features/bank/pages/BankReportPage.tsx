import type { BankReportFilter } from '@app/shared'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useBankAccounts } from '@/features/catalog'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { BankBalancesReport } from '../components/reports/BankBalancesReport'
import { BankBookReport } from '../components/reports/BankBookReport'
import { BankDailyBalanceReport } from '../components/reports/BankDailyBalanceReport'
import { BANK_REPORTS, type BankReportSlug } from '../types'

// Preset kỳ báo cáo — chọn preset ghi from/to vào URL params (share link được).
const PRESETS: { key: string; label: string; range: () => { from: string; to: string } }[] = [
  { key: 'month', label: 'Tháng này', range: () => monthRange(0) },
  { key: 'prev-month', label: 'Tháng trước', range: () => monthRange(-1) },
  { key: 'quarter', label: 'Quý này', range: quarterRange },
  { key: 'year', label: 'Năm nay', range: yearRange },
]

const inputClass =
  'h-8 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

// Trang xem báo cáo tiền gửi full-page (§5 design.md). Route: /bank/reports/:slug
// Bảng kê số dư ngân hàng chỉ dùng mốc "đến ngày"; sổ tiền gửi lọc thêm theo TKNH.
export function BankReportPage() {
  const navigate = useNavigate()
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

  const activePreset = PRESETS.find((p) => {
    const r = p.range()
    return r.from === fromDate && r.to === toDate
  })?.key

  return (
    <RecordPageShell
      title={report?.name ?? 'Báo cáo'}
      subtitle={balanceOnly ? `Đến ngày ${formatDate(toDate)}` : `Kỳ ${formatDate(fromDate)} – ${formatDate(toDate)}`}
      onClose={() => navigate('/bank')}
    >
      <div className="mx-auto flex h-full max-w-6xl flex-col gap-3">
        {/* Bộ lọc kỳ báo cáo */}
        <div className="flex flex-wrap items-center gap-2">
          {!balanceOnly && (
            <>
              <select
                value={activePreset ?? 'custom'}
                onChange={(e) => {
                  const preset = PRESETS.find((p) => p.key === e.target.value)
                  if (preset) {
                    const r = preset.range()
                    setRange(r.from, r.to)
                  }
                }}
                className={inputClass}
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
                  className={inputClass}
                />
              </label>
            </>
          )}
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            Đến ngày
            <input
              type="date"
              value={toDate}
              min={balanceOnly ? undefined : fromDate}
              onChange={(e) =>
                e.target.value &&
                (balanceOnly ? setParam('to', e.target.value) : setRange(fromDate, e.target.value))
              }
              className={inputClass}
            />
          </label>
          {slug === 'bank-book' && (
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              Tài khoản
              <BankAccountSelect value={bankAccountNo} onChange={(v) => setParam('bank', v)} />
            </label>
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
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} min-w-56 bg-white`}>
      <option value="">Tất cả tài khoản</option>
      {(data?.data ?? []).map((a) => (
        <option key={a.id} value={a.accountNumber}>
          {a.accountNumber} — {a.bankName}
        </option>
      ))}
    </select>
  )
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
