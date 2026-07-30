import { test, expect, type Page } from '@playwright/test'
import { fieldInput } from '../helpers/form'
import { fillFirstItemLine } from '../helpers/voucher'

async function openNewPurchaseVoucher(page: Page) {
  await page.goto('/purchase?tab=purchase')
  await page.getByRole('button', { name: 'Thêm', exact: true }).click()
  await page.getByRole('button', { name: 'Chứng từ mua hàng', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Chứng từ mua hàng/ })).toBeVisible()
}

test.describe('Mua hàng', () => {
  test('mua hàng nhập kho chưa thanh toán (NK, phiếu nhập tự sinh)', async ({ page }) => {
    await openNewPurchaseVoucher(page)

    await fieldInput(page, 'Tên nhà cung cấp').fill('NCC E2E')
    const noInput = fieldInput(page, 'Số phiếu nhập')
    await expect(noInput).toHaveValue(/^NK/)
    const voucherNo = await noInput.inputValue()

    await fillFirstItemLine(page, 'BINHDAU', '400000')
    // Kho bắt buộc với mua hàng nhập kho (backend) — chọn kho seed (Enter = match đầu).
    const khoInput = page.locator('table tbody tr').first().getByPlaceholder('Mã kho')
    await khoInput.click()
    await khoInput.fill('KHO')
    await khoInput.press('Enter')
    await page.getByRole('button', { name: 'Lưu và Đóng' }).click()
    await expect(page).toHaveURL(/\/purchase(?!\/vouchers)/)

    await page.goto('/purchase?tab=purchase')
    const row = page.locator('tbody tr', { hasText: voucherNo })
    await expect(row).toContainText('NCC E2E')
  })

  test('mua dịch vụ thanh toán ngay (PC tự sinh bên Tiền mặt)', async ({ page }) => {
    // Mua dịch vụ là loại chứng từ riêng trong menu Thêm (không còn trong dropdown loại nghiệp vụ).
    await page.goto('/purchase?tab=purchase')
    await page.getByRole('button', { name: 'Thêm', exact: true }).click()
    await page.getByRole('button', { name: 'Chứng từ mua dịch vụ', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Chứng từ mua dịch vụ/ })).toBeVisible()

    await page.locator('label', { hasText: 'Thanh toán ngay' }).locator('input[type=radio]').check()

    await fieldInput(page, 'Tên nhà cung cấp').fill('NCC E2E')
    // Thanh toán ngay bằng tiền mặt → chứng từ lấy số của phiếu chi (PC).
    const noInput = fieldInput(page, 'Số chứng từ')
    await expect(noInput).toHaveValue(/^PC/)
    const voucherNo = await noInput.inputValue()

    await fillFirstItemLine(page, 'BOM 37', '1000000', 'Mã dịch vụ')
    await page.getByRole('button', { name: 'Lưu và Đóng' }).click()
    await expect(page).toHaveURL(/\/purchase(?!\/vouchers)/)

    await page.goto('/purchase?tab=purchase')
    await expect(page.locator('tbody tr', { hasText: voucherNo })).toBeVisible()

    // Phiếu chi tự sinh cùng số bên phân hệ Tiền mặt.
    await page.goto('/cash?tab=txn')
    await expect(page.locator('tbody tr', { hasText: voucherNo })).toBeVisible()
  })
})
