import { test, expect } from '@playwright/test'
import { fillAccount } from '../helpers/account'
import { fieldInput } from '../helpers/form'
import { createCashVoucher, rowMenuAction } from '../helpers/voucher'
import { createSalesVoucher } from '../helpers/sales'

// Xóa chứng từ = hành động phá hủy (ConfirmDialog "không thể hoàn tác") — chỉ có ở
// sales / general / inventory. Cash & bank cố tình KHÔNG có mục Xóa (chỉ Bỏ ghi).
test.describe('Xóa chứng từ', () => {
  test('xóa chứng từ nghiệp vụ khác (NVK) kèm xác nhận', async ({ page }) => {
    await page.goto('/general/vouchers/new')
    await expect(page.getByRole('heading', { name: /Chứng từ nghiệp vụ khác/ })).toBeVisible()
    const voucherNo = await fieldInput(page, 'Số chứng từ').inputValue()
    await fieldInput(page, 'Diễn giải').fill('NVK để xóa E2E')
    const row = page.getByTestId('general-entry-table').locator('tbody tr').first()
    await fillAccount(page, row.locator('input').nth(1), '1121')
    await fillAccount(page, row.locator('input').nth(2), '1111')
    await row.getByPlaceholder('0').first().fill('123000')
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page).toHaveURL(/\/general(?!\/vouchers)/)

    await page.goto('/general?tab=other-voucher')
    await expect(page.locator('tbody tr', { hasText: voucherNo })).toBeVisible()
    await rowMenuAction(page, voucherNo, 'Xóa')
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toContainText(`Xóa chứng từ ${voucherNo}?`)
    await confirm.getByRole('button', { name: 'Xóa', exact: true }).click()
    await expect(page.locator('tbody tr', { hasText: voucherNo })).toBeHidden()
  })

  test('xóa chứng từ bán hàng kèm xác nhận', async ({ page }) => {
    const voucherNo = await createSalesVoucher(page)
    await page.goto('/sales?tab=sale')
    await expect(page.locator('tbody tr', { hasText: voucherNo })).toBeVisible()

    await rowMenuAction(page, voucherNo, 'Xóa')
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toContainText(`Xóa chứng từ ${voucherNo}?`)
    await confirm.getByRole('button', { name: 'Xóa', exact: true }).click()
    await expect(page.locator('tbody tr', { hasText: voucherNo })).toBeHidden()
  })

  test('phiếu tiền mặt KHÔNG có mục Xóa trong menu', async ({ page }) => {
    const voucherNo = await createCashVoucher(page, 'receipt', 'Phiếu kiểm tra menu xóa', '10000')
    await page.goto('/cash?tab=txn')
    const row = page.locator('tbody tr', { hasText: voucherNo })
    await row.getByLabel('Thao tác khác').click()
    // Menu mở (Nhân bản có mặt) nhưng không chìa Xóa cho chứng từ tiền mặt.
    await expect(page.getByRole('menuitem', { name: 'Nhân bản', exact: true })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Xóa', exact: true })).toHaveCount(0)
  })
})
