import { test, expect } from '@playwright/test'
import { createSalesVoucher } from '../helpers/sales'

// Phát hành hóa đơn: hành động chính của dòng bán hàng chưa có số HĐ
// (IssueInvoiceDialog — nhập tay, chưa tích hợp HĐĐT).
test.describe('Bán hàng — phát hành hóa đơn', () => {
  test('phát hành hóa đơn cho chứng từ chưa có số HĐ', async ({ page }) => {
    const voucherNo = await createSalesVoucher(page)
    await page.goto('/sales?tab=sale')
    const row = page.locator('tbody tr', { hasText: voucherNo })
    // Chưa có SỐ hóa đơn → hành động chính là "Phát hành hóa đơn"
    // (badge TT lập hóa đơn theo cờ withInvoice, không theo số HĐ).
    await row.getByRole('button', { name: 'Phát hành hóa đơn' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(`Phát hành hóa đơn — ${voucherNo}`)).toBeVisible()
    const invoiceNo = `${Date.now()}`.slice(-8)
    await dialog.getByPlaceholder('VD: 00004693').fill(invoiceNo)
    await dialog.getByRole('button', { name: 'Phát hành', exact: true }).click()
    await expect(page.getByText('Đã phát hành hóa đơn')).toBeVisible()

    // Đã có số HĐ → cột Số hóa đơn cập nhật, hành động chính đổi thành "Xem".
    await expect(row).toContainText(invoiceNo)
    await expect(row.getByText('Đã lập')).toBeVisible()
    await expect(row.getByRole('button', { name: 'Xem' })).toBeVisible()
    await expect(row.getByRole('button', { name: 'Phát hành hóa đơn' })).toHaveCount(0)
  })
})
