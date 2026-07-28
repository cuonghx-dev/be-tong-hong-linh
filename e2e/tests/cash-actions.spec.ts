import { test, expect } from '@playwright/test'
import { fieldInput } from '../helpers/form'
import { createCashVoucher, rowMenuAction } from '../helpers/voucher'

test.describe('Tiền mặt — thao tác chứng từ', () => {
  test('tạo phiếu chi, xuất hiện trong danh sách', async ({ page }) => {
    const voucherNo = await createCashVoucher(page, 'payment', 'Chi tiền test tự động', '250000')
    await page.goto('/cash?tab=txn')
    const row = page.locator('tbody tr', { hasText: voucherNo })
    await expect(row).toContainText('Chi tiền test tự động')
    await expect(row).toContainText('250.000')
  })

  test('sửa phiếu qua Xem → Sửa nhanh', async ({ page }) => {
    const voucherNo = await createCashVoucher(page, 'receipt', 'Lý do trước khi sửa', '111000')
    await page.goto('/cash?tab=txn')
    await page.locator('tbody tr', { hasText: voucherNo }).getByRole('button', { name: 'Xem' }).click()
    await expect(page.getByRole('heading', { name: /Xem phiếu thu/ })).toBeVisible()

    await page.getByRole('button', { name: 'Sửa nhanh' }).click()
    await expect(page.getByRole('heading', { name: /Sửa phiếu thu/ })).toBeVisible()
    await fieldInput(page, 'Lý do nộp').fill('Lý do sau khi sửa')
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page).toHaveURL(/\/cash\/vouchers\/(?!.*edit)/)

    await page.goto('/cash?tab=txn')
    await expect(page.locator('tbody tr', { hasText: voucherNo })).toContainText('Lý do sau khi sửa')
  })

  test('bỏ ghi rồi ghi sổ lại từ danh sách', async ({ page }) => {
    // Phiếu tạo mới mặc định ĐÃ ghi sổ (posted default true) → không có badge.
    const voucherNo = await createCashVoucher(page, 'receipt', 'Phiếu để ghi sổ', '99000')
    await page.goto('/cash?tab=txn')
    const row = page.locator('tbody tr', { hasText: voucherNo })
    await expect(row).toBeVisible()
    await expect(row.getByText('Chưa ghi sổ')).toBeHidden()

    await rowMenuAction(page, voucherNo, 'Bỏ ghi')
    await expect(row.getByText('Chưa ghi sổ')).toBeVisible()

    await rowMenuAction(page, voucherNo, 'Ghi sổ')
    await expect(row.getByText('Chưa ghi sổ')).toBeHidden()
  })

  test('nhân bản phiếu thu', async ({ page }) => {
    const sourceNo = await createCashVoucher(page, 'receipt', 'Phiếu gốc nhân bản', '77000')
    await page.goto('/cash?tab=txn')
    await rowMenuAction(page, sourceNo, 'Nhân bản')

    await expect(page).toHaveURL(/\/cash\/vouchers\/new\?.*duplicateFrom=/)
    // Dữ liệu điền sẵn từ phiếu gốc (số phiếu MỚI cấp lúc Lưu).
    await expect(fieldInput(page, 'Lý do nộp')).toHaveValue('Phiếu gốc nhân bản')

    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page).toHaveURL(/\/cash(?!\/vouchers)/)
    await page.goto('/cash?tab=txn')
    // 2 phiếu (gốc + bản sao) cùng lý do, số chứng từ khác nhau.
    await expect(page.locator('tbody tr', { hasText: 'Phiếu gốc nhân bản' })).toHaveCount(2)
    await expect(page.locator('tbody tr', { hasText: sourceNo })).toHaveCount(1)
  })
})
