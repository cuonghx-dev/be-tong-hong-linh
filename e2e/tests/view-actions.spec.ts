import { test, expect } from '@playwright/test'
import { fieldInput } from '../helpers/form'
import { fillFirstItemLine, rowMenuAction } from '../helpers/voucher'
import { fillWarehouse } from '../helpers/account'
import { createSalesVoucher } from '../helpers/sales'

// Nút "Sửa nhanh" + "Ghi sổ/Bỏ ghi" ở footer trang XEM chứng từ (mode view) —
// đường đi chính của kế toán: mở xem rồi thao tác tại chỗ, không quay lại list.
test.describe('Trang xem chứng từ — Sửa nhanh / Ghi sổ / Bỏ ghi', () => {
  test('bán hàng: bỏ ghi + ghi sổ + sửa nhanh từ trang xem', async ({ page }) => {
    const voucherNo = await createSalesVoucher(page)
    await page.goto('/sales?tab=sale')
    // Chứng từ chưa có hóa đơn → hành động chính là "Phát hành hóa đơn", Xem nằm trong menu.
    await rowMenuAction(page, voucherNo, 'Xem')
    await expect(page).toHaveURL(/\/sales\/vouchers\/(?!new)/)

    // Chứng từ mới posted mặc định → footer hiện "Bỏ ghi"; toggle đảo lại được.
    await page.getByRole('button', { name: 'Bỏ ghi', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Ghi sổ', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Ghi sổ', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Bỏ ghi', exact: true })).toBeVisible()

    // Toast sonner "Đã ghi sổ chứng từ" đè lên footer chặn click — rời chuột chờ toast tắt.
    await page.mouse.move(0, 0)
    await expect(page.getByText('Đã ghi sổ chứng từ')).toBeHidden({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Sửa nhanh' }).click()
    await expect(page).toHaveURL(/\/sales\/vouchers\/.+\/edit/)
  })

  test('phiếu nhập kho: bỏ ghi + ghi sổ + sửa nhanh từ trang xem', async ({ page }) => {
    await page.goto('/inventory/receipts/new')
    await expect(page.getByRole('heading', { name: /Phiếu nhập kho/ })).toBeVisible()
    const voucherNo = await fieldInput(page, 'Số chứng từ').inputValue()
    await fieldInput(page, 'Diễn giải').fill('NK xem tại chỗ E2E')
    await fillFirstItemLine(page, 'BINHDAU', '100000')
    await fillWarehouse(page.locator('table tbody tr').first())
    await page.getByRole('button', { name: 'Cất', exact: true }).click()
    await expect(page).toHaveURL(/\/inventory(?!\/receipts)/)

    await page.goto('/inventory?tab=in')
    await page.locator('tbody tr', { hasText: voucherNo }).getByRole('button', { name: 'Xem' }).click()
    await expect(page).toHaveURL(/\/inventory\/receipts\/(?!new)/)

    await page.getByRole('button', { name: 'Bỏ ghi', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Ghi sổ', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Ghi sổ', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Bỏ ghi', exact: true })).toBeVisible()

    // Toast sonner đè lên footer chặn click — rời chuột chờ toast tắt.
    await page.mouse.move(0, 0)
    await expect(page.getByText('Đã ghi sổ chứng từ')).toBeHidden({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Sửa nhanh' }).click()
    await expect(page).toHaveURL(/\/inventory\/receipts\/.+\/edit/)
  })
})
