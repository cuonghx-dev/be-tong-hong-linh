import type { SalesReportFilter } from '@app/shared'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { formatDate, monthRange, REPORT_PRESETS } from '@/shared/lib/report-period'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useCustomers } from '../api/useCustomers'
import { ReceivableDetailReport } from '../components/reports/ReceivableDetailReport'
import { ReceivableSummaryReport } from '../components/reports/ReceivableSummaryReport'
import { SalesByItemReport } from '../components/reports/SalesByItemReport'
import { SalesDetailReport } from '../components/reports/SalesDetailReport'
import { reportHasCustomerFilter, SALES_REPORTS, type SalesReportSlug } from '../types'

const inputClass =
  'h-8 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

// Trang xem báo cáo bán hàng full-page (§5 design.md). Route: /sales/reports/:slug
// 2 báo cáo công nợ lọc thêm được theo 1 khách hàng.
export function SalesReportPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()

  const report = SALES_REPORTS.find((r) => r.slug === slug)
  const defaultRange = monthRange(0)
  const fromDate = params.get('from') ?? defaultRange.from
  const toDate = params.get('to') ?? defaultRange.to
  const customerId = params.get('customer') ?? ''
  const filter: SalesReportFilter = { fromDate, toDate, customerId: customerId || undefined }

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
      subtitle={`Kỳ ${formatDate(fromDate)} – ${formatDate(toDate)}`}
      onClose={() => navigate('/sales')}
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
          {reportHasCustomerFilter(slug as SalesReportSlug) && (
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              Khách hàng
              <CustomerSelect value={customerId} onChange={(v) => setParam('customer', v)} />
            </label>
          )}
        </div>

        {/* Bảng báo cáo — tự cuộn trong khung */}
        <div className="flex-1 overflow-auto rounded-lg border border-border bg-white">
          {renderReport(slug as SalesReportSlug, filter)}
        </div>
      </div>
    </RecordPageShell>
  )
}

function renderReport(slug: SalesReportSlug, filter: SalesReportFilter) {
  switch (slug) {
    case 'receivable-summary':
      return <ReceivableSummaryReport filter={filter} />
    case 'receivable-detail':
      return <ReceivableDetailReport filter={filter} />
    case 'by-item':
      return <SalesByItemReport filter={filter} />
    case 'detail':
      return <SalesDetailReport filter={filter} />
    default:
      return <div className="px-3 py-10 text-center text-slate-400">Không tìm thấy báo cáo.</div>
  }
}

// Select khách hàng từ danh mục (rỗng = tất cả).
function CustomerSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data } = useCustomers({ page: 1, pageSize: 500 })
  return (
    <Select value={value || 'all'} onValueChange={(v) => onChange(v === 'all' ? '' : v)}>
      <SelectTrigger className="h-8 w-auto min-w-56 bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả khách hàng</SelectItem>
        {(data?.data ?? []).map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.code} — {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
