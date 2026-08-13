import { test, expect } from '@playwright/test'
import { createCashVoucher } from '../helpers/voucher'

// Filter + tìm kiếm bảng chứng từ đi qua URL search params (share link, back/forward).
test.describe('Tiền mặt — lọc và tìm kiếm', () => {
  test('lọc theo loại Phiếu chi qua FilterPopover → URL param + chỉ còn PC', async ({ page }) => {
    // Đảm bảo có ít nhất 1 phiếu thu + 1 phiếu chi để phép lọc có ý nghĩa.
    await createCashVoucher(page, 'receipt', 'Phiếu thu cho test lọc', '11000')
    const paymentNo = await createCashVoucher(page, 'payment', 'Phiếu chi cho test lọc', '22000')

    await page.goto('/cash?tab=txn')
    await page.getByRole('button', { name: /Lọc/ }).click()
    // Popover lọc: Loại chứng từ = Phiếu chi.
    await page.getByRole('combobox').first().click()
    await page.getByRole('listbox').getByRole('option', { name: 'Phiếu chi', exact: true }).click()
    await page.getByRole('button', { name: 'Lọc', exact: true }).last().click()

    await expect(page).toHaveURL(/type=PAYMENT/)
    await expect(page.locator('tbody tr', { hasText: paymentNo })).toBeVisible()
    // Không còn dòng phiếu thu nào (số phiếu thu dải PT).
    await expect(page.locator('tbody tr', { hasText: /PT\d/ })).toHaveCount(0)

    // Đặt lại → bỏ param, phiếu thu hiện lại. Popover re-render khi URL đổi
    // → nút có thể detach giữa chừng, retry cả khối.
    await expect(async () => {
      const reset = page.getByRole('button', { name: 'Đặt lại', exact: true })
      if (!(await reset.isVisible())) await page.getByRole('button', { name: /Lọc/ }).first().click()
      await reset.click({ timeout: 2000 })
    }).toPass({ timeout: 15_000 })
    await expect(page).not.toHaveURL(/type=PAYMENT/)
  })

  test('tìm kiếm theo lý do → URL param q + đúng 1 kết quả', async ({ page }) => {
    const reason = `Lý do tìm kiếm E2E ${Date.now()}`
    const voucherNo = await createCashVoucher(page, 'receipt', reason, '33000')

    await page.goto('/cash?tab=txn')
    // exact — header có ô search global "Tìm kiếm chứng từ, đối tượng…" cùng prefix.
    await page.getByPlaceholder('Tìm kiếm', { exact: true }).fill(reason)
    await page.getByPlaceholder('Tìm kiếm', { exact: true }).press('Enter')

    await expect(page).toHaveURL(/q=/)
    await expect(page.locator('tbody tr')).toHaveCount(1)
    await expect(page.locator('tbody tr', { hasText: voucherNo })).toContainText(reason)
    await expect(page.getByText('Tổng số: 1')).toBeVisible()
  })
})
