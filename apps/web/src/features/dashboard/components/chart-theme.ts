// Tham số hiển thị chung cho biểu đồ Tổng quan.
// Màu series đã validate CVD/contrast (dataviz six-checks) — KHÔNG đổi thứ tự.

// 3 series chính: doanh thu/thu (aqua), chi phí/chi (blue), lợi nhuận/tồn (orange).
export const SERIES = {
  revenue: '#1baf7a',
  expense: '#2a78d6',
  profit: '#eb6834',
} as const

// Palette categorical (donut chi phí, ô màu danh sách) — gán theo thứ tự cố định.
export const CATEGORICAL = ['#2a78d6', '#1baf7a', '#eda100', '#4a3aa7', '#e34948', '#eb6834']

// Màu trạng thái công nợ quá hạn (status, không dùng lại cho series).
export const OVERDUE_COLOR = '#eb6834'

export const GRID_STROKE = '#eef2f7'
export const AXIS_TICK = { fontSize: 11, fill: '#94a3b8' } as const

export const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => `Th ${i + 1}`)

// Chuỗi Decimal từ API → number để vẽ (chỉ hiển thị, không tính toán tiền).
export function toNumber(value: string | undefined): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}
