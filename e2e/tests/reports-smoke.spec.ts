import { test, expect, type Page } from '@playwright/test'

// Smoke toàn bộ báo cáo: mỗi slug deep-link render được (tiêu đề hiện, không rơi
// vào nhánh "Không tìm thấy báo cáo."). Slug + tên đồng bộ features/*/types.ts.
const REPORTS: Record<string, { slug: string; name: string }[]> = {
  cash: [
    { slug: 'receipt-journal', name: 'S03a1-DNN: Sổ nhật ký thu tiền' },
    { slug: 'payment-journal', name: 'S03a2-DNN: Sổ nhật ký chi tiền' },
    { slug: 'cash-book', name: 'Sổ kế toán chi tiết quỹ tiền mặt' },
    { slug: 'daily-balance', name: 'Bảng kê số dư tiền theo ngày' },
  ],
  bank: [
    { slug: 'bank-book', name: 'Sổ tiền gửi ngân hàng' },
    { slug: 'account-balances', name: 'Bảng kê số dư ngân hàng' },
    { slug: 'daily-balance', name: 'Bảng kê số dư tiền theo ngày' },
  ],
  sales: [
    { slug: 'receivable-summary', name: 'Tổng hợp công nợ phải thu khách hàng' },
    { slug: 'receivable-detail', name: 'Chi tiết công nợ phải thu khách hàng' },
    { slug: 'by-item', name: 'Tổng hợp bán hàng theo mặt hàng' },
    { slug: 'detail', name: 'Sổ chi tiết bán hàng' },
  ],
  purchase: [
    { slug: 'detail', name: 'Sổ chi tiết mua hàng' },
    { slug: 'by-item', name: 'Tổng hợp mua hàng theo mặt hàng' },
    { slug: 'payable-summary', name: 'Tổng hợp công nợ phải trả nhà cung cấp' },
    { slug: 'payable-detail', name: 'Chi tiết công nợ phải trả nhà cung cấp' },
  ],
  inventory: [
    { slug: 'stock-summary', name: 'Tổng hợp tồn kho' },
    { slug: 'item-ledger', name: 'Sổ chi tiết vật tư hàng hóa' },
  ],
  general: [
    { slug: 'general-journal', name: 'S03a-DNN: Sổ nhật ký chung' },
    { slug: 'account-ledger', name: 'S03b-DNN: Sổ chi tiết các tài khoản' },
  ],
}

async function assertReportRenders(page: Page, module: string, slug: string, name: string) {
  await page.goto(`/${module}/reports/${slug}`)
  await expect(page.getByText(name).first()).toBeVisible()
  await expect(page.getByText('Không tìm thấy báo cáo.')).toHaveCount(0)
}

test.describe('Báo cáo — smoke render mọi slug', () => {
  for (const [module, reports] of Object.entries(REPORTS)) {
    test(`${module}: ${reports.length} báo cáo render`, async ({ page }) => {
      for (const r of reports) await assertReportRenders(page, module, r.slug, r.name)
    })
  }
})
