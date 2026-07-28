import { test, expect, type Page } from '@playwright/test'
import { fieldInput, fieldInputIn } from '../helpers/form'
import { fillFirstItemLine } from '../helpers/voucher'

const CUSTOMER = { code: 'KH-E2E', name: 'Khách hàng E2E' }

// Chọn khách hàng trong PartnerPicker; chưa có thì tạo nhanh qua dialog "Thêm đối tượng".
async function pickOrCreateCustomer(page: Page) {
  const picker = page.getByPlaceholder('Mã KH')
  await picker.click()
  await picker.pressSequentially(CUSTOMER.code, { delay: 20 })
  // Chờ dropdown load xong (row khớp hoặc empty-state) rồi mới quyết định.
  const existing = page.getByRole('cell', { name: CUSTOMER.code, exact: true })
  const empty = page.getByText('Không có đối tượng phù hợp.')
  await expect(existing.or(empty).first()).toBeVisible()
  if (await existing.count()) {
    await existing.first().click()
    return
  }
  // 2 nút "Thêm đối tượng" (KH + nhân viên bán hàng) → lấy nút cạnh picker KH (đầu tiên).
  await page.getByLabel('Thêm đối tượng').first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Thêm đối tượng')).toBeVisible()
  await fieldInputIn(dialog, page, 'Mã đối tượng').fill(CUSTOMER.code)
  await fieldInputIn(dialog, page, 'Tên đối tượng').fill(CUSTOMER.name)
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toBeHidden()
}

test.describe('Bán hàng', () => {
  test('tạo chứng từ bán chưa thu tiền (BH)', async ({ page }) => {
    await page.goto('/sales?tab=sale')
    await page.getByRole('button', { name: 'Thêm', exact: true }).click()
    await page.getByRole('button', { name: 'Chứng từ bán hàng', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Chứng từ bán hàng/ })).toBeVisible()

    // Không kiêm phiếu xuất — tồn kho seed = 0.
    await page.locator('label', { hasText: 'Kiêm phiếu xuất' }).locator('input[type=checkbox]').uncheck()

    await pickOrCreateCustomer(page)
    await expect(fieldInput(page, 'Tên khách hàng')).toHaveValue(CUSTOMER.name)

    const noInput = fieldInput(page, 'Số chứng từ')
    await expect(noInput).toHaveValue(/^BH/)
    const voucherNo = await noInput.inputValue()

    await fillFirstItemLine(page, 'BINHDAU', '500000')
    await page.getByRole('button', { name: 'Lưu và Đóng' }).click()
    await expect(page).toHaveURL(/\/sales(?!\/vouchers)/)

    await page.goto('/sales?tab=sale')
    const row = page.locator('tbody tr', { hasText: voucherNo })
    await expect(row).toContainText(CUSTOMER.name)
  })

  test('tạo chứng từ bán thu tiền mặt ngay (PT)', async ({ page }) => {
    await page.goto('/sales?tab=sale')
    await page.getByRole('button', { name: 'Thêm', exact: true }).click()
    await page.getByRole('button', { name: 'Chứng từ bán hàng', exact: true }).click()

    await page.locator('label', { hasText: 'Kiêm phiếu xuất' }).locator('input[type=checkbox]').uncheck()
    await page.locator('label', { hasText: 'Thu tiền mặt ngay' }).locator('input[type=radio]').check()

    // Số chứng từ đổi sang dải phiếu thu.
    const noInput = fieldInput(page, 'Số chứng từ')
    await expect(noInput).toHaveValue(/^PT/)
    const voucherNo = await noInput.inputValue()

    await pickOrCreateCustomer(page)
    await fillFirstItemLine(page, 'BINHDAU', '300000')
    await page.getByRole('button', { name: 'Lưu và Đóng' }).click()
    await expect(page).toHaveURL(/\/sales(?!\/vouchers)/)

    await page.goto('/sales?tab=sale')
    await expect(page.locator('tbody tr', { hasText: voucherNo })).toBeVisible()

    // Chứng từ tự sinh: phiếu thu cùng số bên phân hệ Tiền mặt.
    await page.goto('/cash?tab=txn')
    await expect(page.locator('tbody tr', { hasText: voucherNo })).toBeVisible()
  })

  test('thu nợ khách hàng (đối trừ chứng từ)', async ({ page }) => {
    await page.goto('/sales?tab=debt')
    const row = page.locator('tbody tr', { hasText: CUSTOMER.name })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'Thu nợ' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(`Thu tiền khách hàng — ${CUSTOMER.name}`)).toBeVisible()
    // Tick chứng từ nợ đầu tiên → tự điền toàn bộ số còn phải thu.
    await dialog.locator('tbody tr').first().locator('input[type=checkbox]').check()
    await expect(dialog.getByText(/Tổng thu:/)).not.toContainText('Tổng thu: 0')

    await dialog.getByRole('button', { name: 'Thu tiền', exact: true }).click()
    await expect(page.getByText('Đã thu tiền khách hàng')).toBeVisible()
  })
})
