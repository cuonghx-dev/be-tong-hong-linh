// Helpers kỳ báo cáo dùng chung cho các trang xem báo cáo full-page
// (giờ địa phương, format yyyy-mm-dd).

export interface ReportRange {
  from: string
  to: string
}

// Preset kỳ báo cáo — chọn preset ghi from/to vào URL params (share link được).
export const REPORT_PRESETS: { key: string; label: string; range: () => ReportRange }[] = [
  { key: 'month', label: 'Tháng này', range: () => monthRange(0) },
  { key: 'prev-month', label: 'Tháng trước', range: () => monthRange(-1) },
  { key: 'quarter', label: 'Quý này', range: quarterRange },
  { key: 'year', label: 'Năm nay', range: yearRange },
]

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// offset: 0 = tháng này, -1 = tháng trước.
export function monthRange(offset: number): ReportRange {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return {
    from: iso(first.getFullYear(), first.getMonth(), 1),
    to: iso(last.getFullYear(), last.getMonth(), last.getDate()),
  }
}

export function quarterRange(): ReportRange {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3)
  const last = new Date(now.getFullYear(), q * 3 + 3, 0)
  return {
    from: iso(now.getFullYear(), q * 3, 1),
    to: iso(now.getFullYear(), last.getMonth(), last.getDate()),
  }
}

export function yearRange(): ReportRange {
  const y = new Date().getFullYear()
  return { from: iso(y, 0, 1), to: iso(y, 11, 31) }
}

// yyyy-mm-dd → dd/mm/yyyy (subtitle kỳ báo cáo).
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return d && m && y ? `${d}/${m}/${y}` : isoDate
}
