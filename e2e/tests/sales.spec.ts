import { test, expect } from '@playwright/test'
import { fieldInput } from '../helpers/form'
import { fillFirstItemLine } from '../helpers/voucher'
import { CUSTOMER, pickOrCreateCustomer } from '../helpers/sales'

test.describe('Bán hàng', () => {
  test('tạo chứng từ bán chưa thu tiền (BH)', async ({ page }) => {
    await page.goto('/sales?tab=sale')
    await page.getByRole('button', { name: 'Thêm', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Chứng từ bán hàng', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Chứng từ bán hàng/ })).toBeVisible()

    // Không kiêm phiếu xuất — tồn kho seed = 0.
    await page.getByRole('checkbox', { name: 'Kiêm phiếu xuất' }).uncheck()

    await pickOrCreateCustomer(page)
    await expect(fieldInput(page, 'Tên khách hàng')).toHaveValue(CUSTOMER.name)

    const noInput = fieldInput(page, 'Số chứng từ')
    await expect(noInput).toHaveValue(/^BH/)
    const voucherNo = await noInput.inputValue()

    await fillFirstItemLine(page, 'BINHDAU', '500000')
    await page.getByRole('button', { name: 'Cất', exact: true }).click()
    await expect(page).toHaveURL(/\/sales(?!\/vouchers)/)

    await page.goto('/sales?tab=sale')
    const row = page.locator('tbody tr', { hasText: voucherNo })
    await expect(row).toContainText(CUSTOMER.name)
  })

  test('tạo chứng từ bán thu tiền mặt ngay (PT)', async ({ page }) => {
    await page.goto('/sales?tab=sale')
    await page.getByRole('button', { name: 'Thêm', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Chứng từ bán hàng', exact: true }).click()

    await page.getByRole('checkbox', { name: 'Kiêm phiếu xuất' }).uncheck()
    await page.getByRole('radio', { name: 'Thu tiền mặt ngay' }).check()

    // Số chứng từ đổi sang dải phiếu thu.
    const noInput = fieldInput(page, 'Số chứng từ')
    await expect(noInput).toHaveValue(/^PT/)
    const voucherNo = await noInput.inputValue()

    await pickOrCreateCustomer(page)
    await fillFirstItemLine(page, 'BINHDAU', '300000')
    await page.getByRole('button', { name: 'Cất', exact: true }).click()
    await expect(page).toHaveURL(/\/sales(?!\/vouchers)/)

    await page.goto('/sales?tab=sale')
    await expect(page.locator('tbody tr', { hasText: voucherNo })).toBeVisible()

    // Chứng từ tự sinh: phiếu thu cùng số bên phân hệ Tiền mặt.
    await page.goto('/cash?tab=txn')
    await expect(page.locator('tbody tr', { hasText: voucherNo })).toBeVisible()
  })

  test('thu nợ khách hàng (đối trừ chứng từ)', async ({ page }) => {
    // Bảng công nợ liệt kê MỌI khách hàng (seed danh mục > 20 dòng/trang) → lọc theo mã.
    await page.goto(`/sales?tab=debt&rq=${CUSTOMER.code}`)
    const row = page.locator('tbody tr', { hasText: CUSTOMER.name })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'Thu nợ' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(`Thu tiền khách hàng — ${CUSTOMER.name}`)).toBeVisible()
    // Tick chứng từ nợ đầu tiên → tự điền toàn bộ số còn phải thu.
    await dialog.locator('tbody tr').first().getByRole('checkbox').check()
    await expect(dialog.getByText(/Tổng thu:/)).not.toContainText('Tổng thu: 0')

    await dialog.getByRole('button', { name: 'Thu tiền', exact: true }).click()
    await expect(page.getByText('Đã thu tiền khách hàng')).toBeVisible()
  })
})
