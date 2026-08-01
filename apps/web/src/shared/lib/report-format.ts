import { formatCurrency } from '@/shared/lib/currency'

// Helpers định dạng dùng chung cho MỌI bảng báo cáo (trước đây bị copy thành 6 bản
// report-utils.tsx ở cash/bank/sales/purchase/inventory/report).

export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

// Số tiền Decimal-string → chuỗi có phân cách nghìn; số 0 để trống cho dễ đọc sổ.
export function money(value: string, showZero = false): string {
  const n = Number(value)
  if (n === 0 && !showZero) return ''
  return formatCurrency(n)
}

// Số lượng Decimal-string → bỏ số 0 thập phân thừa (NUMERIC(18,4) trong DB).
export function quantity(value: string, showZero = false): string {
  const n = Number(value)
  if (n === 0 && !showZero) return ''
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 4 })
}

// Kỳ báo cáo: trọn 1 tháng → "Tháng M năm Y", ngược lại "Từ ngày … đến ngày …".
export function periodLabel(filter: { fromDate: string; toDate: string }): string {
  const [fy, fm, fd] = filter.fromDate.split('-').map(Number)
  const [ty, tm, td] = filter.toDate.split('-').map(Number)
  if (
    fy !== undefined &&
    fm !== undefined &&
    fd === 1 &&
    fy === ty &&
    fm === tm &&
    td === new Date(fy, fm, 0).getDate()
  ) {
    return `Tháng ${fm} năm ${fy}`
  }
  return `Từ ngày ${formatDate(filter.fromDate)} đến ngày ${formatDate(filter.toDate)}`
}
