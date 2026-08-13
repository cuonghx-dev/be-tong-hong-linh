import { expect, type Page } from '@playwright/test'
import { fieldInput, fieldInputIn } from './form'
import { fillFirstItemLine } from './voucher'

export const CUSTOMER = { code: 'KH-E2E', name: 'Khách hàng E2E' }

// Chọn khách hàng trong PartnerPicker; chưa có thì tạo nhanh qua dialog "Thêm đối tượng".
export async function pickOrCreateCustomer(page: Page) {
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

// Tạo chứng từ bán hàng chưa thu tiền (BH), mặc định KHÔNG kiêm phiếu xuất
// (tồn kho seed = 0). Trả về số chứng từ đã cấp.
export async function createSalesVoucher(
  page: Page,
  opts: { inventoryIssue?: boolean; unitPrice?: string } = {},
) {
  await page.goto('/sales?tab=sale')
  await page.getByRole('button', { name: 'Thêm', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Chứng từ bán hàng', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Chứng từ bán hàng/ })).toBeVisible()

  const issueCheckbox = page.getByRole('checkbox', { name: 'Kiêm phiếu xuất' })
  if (opts.inventoryIssue) await issueCheckbox.check()
  else await issueCheckbox.uncheck()

  await pickOrCreateCustomer(page)
  await expect(fieldInput(page, 'Tên khách hàng')).toHaveValue(CUSTOMER.name)

  const noInput = fieldInput(page, 'Số chứng từ')
  await expect(noInput).toHaveValue(/^BH/)
  const voucherNo = await noInput.inputValue()

  await fillFirstItemLine(page, 'BINHDAU', opts.unitPrice ?? '500000')
  await page.getByRole('button', { name: 'Cất', exact: true }).click()
  await expect(page).toHaveURL(/\/sales(?!\/vouchers)/)
  return voucherNo
}
