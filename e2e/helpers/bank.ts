import { expect, type Page } from '@playwright/test'
import { fieldInput, fieldInputIn, fieldSelectIn, selectValue } from './form'

// Chọn TK ngân hàng trong picker; chưa có thì tạo nhanh qua dialog "Thêm tài khoản ngân hàng".
// `nth`: form CTNB có 2 picker cùng placeholder (tài khoản đi = 0, tài khoản đến = 1).
export async function pickOrCreateBankAccount(page: Page, accountNumber: string, nth = 0) {
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
  await selectValue(page, fieldSelectIn(dialog, page, 'Tên ngân hàng'), { index: 0 })
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toBeHidden()
}

// Tạo thu tiền gửi (NTTK) qua UI. Trả về số chứng từ đã cấp.
export async function createBankReceipt(page: Page, reason: string, amount: string) {
  await page.goto('/bank?tab=txn')
  await page.getByRole('button', { name: 'Thêm', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Thu tiền', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Thu tiền gửi' })).toBeVisible()

  const noInput = fieldInput(page, 'Số chứng từ')
  await expect(noInput).toHaveValue(/^NTTK/)
  const voucherNo = await noInput.inputValue()

  await pickOrCreateBankAccount(page, '0011002345678')
  await fieldInput(page, 'Lý do thu').fill(reason)

  // Dòng hạch toán: TK Nợ prefill 1121, TK Có phải chọn (Enter = match đầu).
  const row = page.locator('table tbody tr').first()
  await row.getByPlaceholder('Số TK').nth(1).fill('711')
  await row.getByPlaceholder('Số TK').nth(1).press('Enter')
  await row.getByPlaceholder('0').fill(amount)

  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(page).toHaveURL(/\/bank(?!\/vouchers)/)
  return voucherNo
}
