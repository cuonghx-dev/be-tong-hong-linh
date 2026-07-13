import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useProducts, useWarehouses } from '@/features/catalog'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { ItemPicker } from '@/shared/ui/item-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { ItemLedgerReport } from '../components/reports/ItemLedgerReport'
import { StockSummaryReport } from '../components/reports/StockSummaryReport'
import { INVENTORY_REPORTS, type InventoryReportSlug } from '../types'

// Preset kỳ báo cáo — chọn preset ghi from/to vào URL params (share link được).
const PRESETS: { key: string; label: string; range: () => { from: string; to: string } }[] = [
  { key: 'month', label: 'Tháng này', range: () => monthRange(0) },
  { key: 'prev-month', label: 'Tháng trước', range: () => monthRange(-1) },
  { key: 'quarter', label: 'Quý này', range: quarterRange },
  { key: 'year', label: 'Năm nay', range: yearRange },
]

const inputClass =
  'h-8 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

// Trang xem báo cáo kho full-page (§5 design.md). Route: /inventory/reports/:slug
// Cả 2 báo cáo lọc theo kho; sổ chi tiết VTHH bắt buộc chọn 1 VTHH (mã).
export function InventoryReportPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()

  const report = INVENTORY_REPORTS.find((r) => r.slug === slug)
  const defaultRange = monthRange(0)
  const fromDate = params.get('from') ?? defaultRange.from
  const toDate = params.get('to') ?? defaultRange.to
  const warehouseCode = params.get('wh') ?? ''
  const itemCode = params.get('item') ?? ''
  const keyword = params.get('q') ?? ''

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
      subtitle={`Kỳ ${formatDate(fromDate)} – ${formatDate(toDate)}`}
      onClose={() => navigate('/inventory')}
    >
      <div className="mx-auto flex h-full max-w-6xl flex-col gap-3">
        {/* Bộ lọc kỳ báo cáo */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={activePreset ?? 'custom'}
            onValueChange={(v) => {
              const preset = PRESETS.find((p) => p.key === v)
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
              {PRESETS.map((p) => (
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
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            Kho
            <WarehouseSelect value={warehouseCode} onChange={(v) => setParam('wh', v)} />
          </label>
          {slug === 'item-ledger' && (
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              VTHH
              <ItemInput value={itemCode} onChange={(v) => setParam('item', v)} />
            </label>
          )}
          {slug === 'stock-summary' && (
            <input
              placeholder="Tìm theo mã/tên VTHH"
              value={keyword}
              onChange={(e) => setParam('q', e.target.value)}
              className={`${inputClass} w-56`}
            />
          )}
        </div>

        {/* Bảng báo cáo — tự cuộn trong khung */}
        <div className="flex-1 overflow-auto rounded-lg border border-border bg-white">
          {renderReport(slug as InventoryReportSlug, {
            fromDate,
            toDate,
            warehouseCode: warehouseCode || undefined,
            itemCode,
            keyword: keyword || undefined,
          })}
        </div>
      </div>
    </RecordPageShell>
  )
}

function renderReport(
  slug: InventoryReportSlug,
  f: { fromDate: string; toDate: string; warehouseCode?: string; itemCode: string; keyword?: string },
) {
  switch (slug) {
    case 'stock-summary':
      return (
        <StockSummaryReport
          filter={{
            fromDate: f.fromDate,
            toDate: f.toDate,
            warehouseCode: f.warehouseCode,
            keyword: f.keyword,
          }}
        />
      )
    case 'item-ledger':
      return (
        <ItemLedgerReport
          filter={{
            fromDate: f.fromDate,
            toDate: f.toDate,
            itemCode: f.itemCode,
            warehouseCode: f.warehouseCode,
          }}
        />
      )
    default:
      return <div className="px-3 py-10 text-center text-slate-400">Không tìm thấy báo cáo.</div>
  }
}

// Select kho từ danh mục (rỗng = tất cả kho).
function WarehouseSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data } = useWarehouses({ page: 1, pageSize: 200 })
  return (
    <Select value={value || 'all'} onValueChange={(v) => onChange(v === 'all' ? '' : v)}>
      <SelectTrigger className="h-8 w-auto min-w-44 bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả kho</SelectItem>
        {(data?.data ?? []).map((w) => (
          <SelectItem key={w.id} value={w.code}>
            {w.code} — {w.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Chọn VTHH từ danh mục — combobox tra cứu theo mã/tên (pattern PartnerPicker).
function ItemInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [keyword, setKeyword] = useState('')
  const { data, isLoading } = useProducts({ page: 1, pageSize: 50, keyword: keyword || undefined })
  return (
    <ItemPicker
      value={value}
      keyword={keyword}
      onKeywordChange={setKeyword}
      items={(data?.data ?? []).map((p) => ({ code: p.code, name: p.name, unit: p.unit }))}
      loading={isLoading}
      onSelect={(item) => onChange(item.code)}
      className="w-56"
    />
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
