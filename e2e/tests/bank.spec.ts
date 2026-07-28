import { test, expect, type Page } from '@playwright/test'
import { fieldInput, fieldInputIn } from '../helpers/form'

// Chọn TK ngân hàng trong picker; chưa có thì tạo nhanh qua dialog "Thêm tài khoản ngân hàng".
// `nth`: form CTNB có 2 picker cùng placeholder (tài khoản đi = 0, tài khoản đến = 1).
async function pickOrCreateBankAccount(page: Page, accountNumber: string, nth = 0) {
  const picker = page.getByPlaceholder('Số TK ngân hàng').nth(nth)
  await picker.click()
  await picker.pressSequentially(accountNumber, { delay: 20 })
  // Chờ dropdown load xong (row khớp hoặc empty-state) rồi mới quyết định.
  const existing = page.getByRole('cell', { name: accountNumber, exact: true })
  const empty = page.getByText('Không có tài khoản phù hợp.')
  await expect(existing.or(empty).first()).toBeVisible()
  if (await existing.count()) {
    await existing.first().click()
    return
  }
  await page.getByLabel('Thêm tài khoản ngân hàng').nth(nth).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Thêm tài khoản ngân hàng')).toBeVisible()
  await fieldInputIn(dialog, page, 'Số tài khoản').fill(accountNumber)
  await fieldInputIn(dialog, page, 'Tên ngân hàng').selectOption({ index: 1 })
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toBeHidden()
}

test.describe('Tiền gửi', () => {
  test('danh sách chứng từ tiền gửi render', async ({ page }) => {
    await page.goto('/bank?tab=txn')
    await expect(page.getByRole('columnheader', { name: /Số chứng.?từ/ })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Số tài khoản NH/ })).toBeVisible()
    await expect(page.getByText(/Tổng số:/)).toBeVisible()
  })

  test('tạo thu tiền gửi (NTTK)', async ({ page }) => {
    await page.goto('/bank?tab=txn')
    await page.getByRole('button', { name: 'Thêm', exact: true }).click()
    await page.getByRole('button', { name: 'Thu tiền', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Thu tiền gửi' })).toBeVisible()

    const noInput = fieldInput(page, 'Số chứng từ')
    await expect(noInput).toHaveValue(/^NTTK/)
    const voucherNo = await noInput.inputValue()

    await pickOrCreateBankAccount(page, '0011002345678')
    await fieldInput(page, 'Lý do thu').fill('Thu tiền gửi test tự động')

    // Dòng hạch toán: TK Nợ prefill 1121, TK Có phải chọn (Enter = match đầu).
    const row = page.locator('table tbody tr').first()
    await row.getByPlaceholder('Số TK').nth(1).fill('711')
    await row.getByPlaceholder('Số TK').nth(1).press('Enter')
    await row.getByPlaceholder('0').fill('2000000')

    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page).toHaveURL(/\/bank(?!\/vouchers)/)
    await page.goto('/bank?tab=txn')
    const listRow = page.locator('tbody tr', { hasText: voucherNo })
    await expect(listRow).toContainText('2.000.000')
    await expect(listRow).toContainText('0011002345678')
  })

  test('tạo ủy nhiệm chi (UNC)', async ({ page }) => {
    await page.goto('/bank?tab=txn')
    await page.getByRole('button', { name: 'Thêm', exact: true }).click()
    await page.getByRole('button', { name: 'Chi tiền', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Ủy nhiệm chi' })).toBeVisible()

    const noInput = fieldInput(page, 'Số chứng từ')
    await expect(noInput).toHaveValue(/^UNC/)
    const voucherNo = await noInput.inputValue()

    await pickOrCreateBankAccount(page, '0011002345678')
    await fieldInput(page, 'Nội dung thanh toán').fill('Chi tiền gửi test tự động')

    // TK Có prefill 1121, TK Nợ phải chọn.
    const row = page.locator('table tbody tr').first()
    await row.getByPlaceholder('Số TK').nth(0).fill('642')
    await row.getByPlaceholder('Số TK').nth(0).press('Enter')
    await row.getByPlaceholder('0').fill('1500000')

    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page).toHaveURL(/\/bank(?!\/vouchers)/)
    await page.goto('/bank?tab=txn')
    await expect(page.locator('tbody tr', { hasText: voucherNo })).toContainText('1.500.000')
  })

  test('tạo chuyển tiền nội bộ (CTNB)', async ({ page }) => {
    await page.goto('/bank?tab=txn')
    await page.getByRole('button', { name: 'Thêm', exact: true }).click()
    await page.getByRole('button', { name: 'Chuyển tiền nội bộ', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Chuyển tiền nội bộ' })).toBeVisible()

    const noInput = fieldInput(page, 'Số chứng từ')
    await expect(noInput).toHaveValue(/^CTNB/)
    const voucherNo = await noInput.inputValue()

    // Tài khoản đi + tài khoản đến (2 picker cùng placeholder).
    await pickOrCreateBankAccount(page, '0011002345678', 0)
    await pickOrCreateBankAccount(page, '0022003456789', 1)
    await fieldInput(page, 'Lý do chuyển').fill('Chuyển tiền nội bộ test tự động')

    // Dòng hạch toán: TK Nợ + TK Có đều prefill 1121 — chỉ nhập số tiền.
    const row = page.locator('table tbody tr').first()
    await row.getByPlaceholder('0').fill('3000000')

    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page).toHaveURL(/\/bank(?!\/vouchers)/)
    await page.goto('/bank?tab=txn')
    const listRow = page.locator('tbody tr', { hasText: voucherNo })
    await expect(listRow).toContainText('3.000.000')
    await expect(listRow).toContainText('Chuyển tiền nội bộ')
  })
})
