import { test, expect } from '@playwright/test'
import { fieldInput } from '../helpers/form'
import { rowMenuAction } from '../helpers/voucher'
import { createBankReceipt } from '../helpers/bank'

// Vòng đời chứng từ tiền gửi từ danh sách: bỏ ghi/ghi sổ + nhân bản
// (bank.spec.ts chỉ phủ tạo mới).
test.describe('Tiền gửi — vòng đời chứng từ', () => {
  test('bỏ ghi rồi ghi sổ lại từ danh sách', async ({ page }) => {
    const voucherNo = await createBankReceipt(page, 'NTTK vòng đời E2E', '450000')
    await page.goto('/bank?tab=txn')
    const row = page.locator('tbody tr', { hasText: voucherNo })
    await expect(row).toBeVisible()
    await expect(row.getByText('Chưa ghi sổ')).toBeHidden()

    await rowMenuAction(page, voucherNo, 'Bỏ ghi')
    await expect(row.getByText('Chưa ghi sổ')).toBeVisible()
    await rowMenuAction(page, voucherNo, 'Ghi sổ')
    await expect(row.getByText('Chưa ghi sổ')).toBeHidden()
  })

  test('nhân bản chứng từ thu tiền gửi', async ({ page }) => {
    const reason = `NTTK gốc nhân bản ${Date.now()}`
    const sourceNo = await createBankReceipt(page, reason, '560000')
    await page.goto('/bank?tab=txn')
    await rowMenuAction(page, sourceNo, 'Nhân bản')

    await expect(page).toHaveURL(/\/bank\/vouchers\/new\?.*duplicateFrom=/)
    // Dữ liệu điền sẵn từ chứng từ gốc (số chứng từ MỚI cấp lúc Lưu).
    await expect(fieldInput(page, 'Lý do thu')).toHaveValue(reason)

    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page).toHaveURL(/\/bank(?!\/vouchers)/)
    await page.goto('/bank?tab=txn')
    await expect(page.locator('tbody tr', { hasText: reason })).toHaveCount(2)
    await expect(page.locator('tbody tr', { hasText: sourceNo })).toHaveCount(1)
  })
})
