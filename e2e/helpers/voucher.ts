import { expect, type Page } from '@playwright/test'
import { fieldInput } from './form'

// Tạo phiếu thu/chi tiền mặt qua UI từ /cash?tab=txn. Trả về số chứng từ đã cấp.
export async function createCashVoucher(
  page: Page,
  kind: 'receipt' | 'payment',
  reason: string,
  amount: string,
): Promise<string> {
  const isReceipt = kind === 'receipt'
  await page.goto('/cash?tab=txn')
  // exact — tránh match substring với tab "Thu, chi tiền".
  await page.getByRole('button', { name: 'Thêm', exact: true }).click()
  await page.getByRole('button', { name: isReceipt ? 'Thu tiền' : 'Chi tiền', exact: true }).click()
  await expect(page).toHaveURL(/\/cash\/vouchers\/new/)
  await expect(
    page.getByRole('heading', { name: isReceipt ? 'Phiếu thu' : 'Phiếu chi' }),
  ).toBeVisible()

  const noInput = fieldInput(page, isReceipt ? 'Số phiếu thu' : 'Số phiếu chi')
  await expect(noInput).toHaveValue(isReceipt ? /^PT/ : /^PC/)
  const voucherNo = await noInput.inputValue()

  await fieldInput(page, isReceipt ? 'Lý do nộp' : 'Lý do chi').fill(reason)
  await page.locator('table tbody tr').first().getByPlaceholder('0').fill(amount)
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(page).toHaveURL(/\/cash(?!\/vouchers)/)
  return voucherNo
}

// Điền dòng hàng đầu tiên của chứng từ mua/bán: chọn mã hàng + đơn giá.
// ItemPicker query server (debounce) → phải CHỜ dropdown hiện row rồi click,
// không dùng Enter (bắn trước khi kết quả về → chọn hụt).
export async function fillFirstItemLine(page: Page, itemCode: string, unitPrice: string) {
  const row = page.locator('table tbody tr').first()
  const itemInput = row.getByPlaceholder('Mã hàng')
  await itemInput.click()
  // Panel picker tự đóng khi có scroll (listener capture) — race không tránh được
  // bằng 1 lượt gõ. Retry: xóa keyword + gõ lại (ký tự đầu tự mở lại panel qua onChange),
  // rồi click cell mã hàng (cell text chỉ tồn tại trong bảng dropdown, panel fixed).
  const cell = page.getByRole('cell', { name: itemCode, exact: true })
  for (let attempt = 0; ; attempt++) {
    await itemInput.press('ControlOrMeta+a')
    await itemInput.press('Backspace')
    await itemInput.pressSequentially(itemCode, { delay: 30 })
    try {
      await cell.click({ timeout: 5000 })
      break
    } catch (e) {
      if (attempt >= 2) throw e
    }
  }
  // Tên hàng đã được điền = item pick thành công.
  await expect(row.locator('td').nth(2).locator('input')).not.toHaveValue('')
  await row.getByPlaceholder('0').first().fill(unitPrice)
}

// Mở menu "Thao tác khác" của dòng chứa voucherNo rồi click 1 mục.
// Menu render trong portal trên document.body → item locate trên page, không scope theo row.
export async function rowMenuAction(page: Page, voucherNo: string, item: string) {
  const row = page.locator('tbody tr', { hasText: voucherNo })
  await row.getByLabel('Thao tác khác').click()
  await page.getByRole('button', { name: item, exact: true }).click()
}
