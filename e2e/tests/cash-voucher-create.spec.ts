import { test, expect } from '@playwright/test'
import { fieldInput } from '../helpers/form'

test.describe('Tiền mặt — tạo phiếu thu', () => {
  test('tạo phiếu thu qua UI, phiếu xuất hiện trong danh sách', async ({ page }) => {
    await page.goto('/cash?tab=txn')

    // AddMenu "＋ Thêm" → Thu tiền → trang chứng từ full-page.
    await page.getByRole('button', { name: 'Thêm' }).click()
    await page.getByRole('button', { name: 'Thu tiền' }).click()
    await expect(page).toHaveURL(/\/cash\/vouchers\/new/)
    await expect(page.getByRole('heading', { name: 'Phiếu thu' })).toBeVisible()

    // Số phiếu dự kiến (PT..../YYYY) — chờ API next-no trả về.
    const voucherNoInput = fieldInput(page, 'Số phiếu thu')
    await expect(voucherNoInput).toHaveValue(/^PT/)
    const voucherNo = await voucherNoInput.inputValue()

    // Lý do nộp + số tiền dòng hạch toán đầu (TK Nợ/Có đã prefill theo loại nghiệp vụ).
    await fieldInput(page, 'Lý do nộp').fill('Thu tiền test tự động')
    await page
      .locator('table tbody tr')
      .first()
      .getByPlaceholder('0')
      .fill('1000000')

    await page.getByRole('button', { name: 'Lưu', exact: true }).click()

    // Lưu xong → quay về /cash; mở tab danh sách, phiếu mới nằm đầu bảng.
    await expect(page).toHaveURL(/\/cash(?!\/vouchers)/)
    await page.goto('/cash?tab=txn')
    const firstRow = page.locator('table tbody tr').first()
    await expect(firstRow).toContainText(voucherNo)
    await expect(firstRow).toContainText('Thu tiền test tự động')
    await expect(firstRow).toContainText('1.000.000')
  })
})
