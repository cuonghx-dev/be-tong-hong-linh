// Format/parse tiền tệ VND. Tính toán KHÔNG dùng float — dùng integer (đồng).

const formatter = new Intl.NumberFormat('vi-VN')

export function formatCurrency(amount: number): string {
  return formatter.format(amount)
}

export function parseCurrency(input: string): number {
  return Number(input.replace(/[^\d-]/g, ''))
}
