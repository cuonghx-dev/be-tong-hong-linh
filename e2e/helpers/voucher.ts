import { expect, type Page } from '@playwright/test'
import { fillAccount } from './account'
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
  await page.getByRole('menuitem', { name: isReceipt ? 'Thu tiền' : 'Chi tiền', exact: true }).click()
  await expect(page).toHaveURL(/\/cash\/vouchers\/new/)
  await expect(
    page.getByRole('heading', { name: isReceipt ? 'Phiếu thu' : 'Phiếu chi' }),
  ).toBeVisible()

  const noInput = fieldInput(page, isReceipt ? 'Số phiếu thu' : 'Số phiếu chi')
  await expect(noInput).toHaveValue(isReceipt ? /^PT/ : /^PC/)
  const voucherNo = await noInput.inputValue()

  await fieldInput(page, isReceipt ? 'Lý do nộp' : 'Lý do chi').fill(reason)
  const line = page.locator('table tbody tr').first()
  // Phiếu chi loại "Chi khác" để trống TK Nợ (MISA cho tự nhập) → phải điền, zod đòi TK Nợ/Có.
  if (!isReceipt) await fillAccount(page, line.locator('input').nth(1), '642')
  await line.getByPlaceholder('0').fill(amount)
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(page).toHaveURL(/\/cash(?!\/vouchers)/)
  return voucherNo
}

// Điền dòng hàng đầu tiên của chứng từ mua/bán: chọn mã hàng + đơn giá.
// ItemPicker query server (debounce) → phải CHỜ dropdown hiện row rồi click,
// không dùng Enter (bắn trước khi kết quả về → chọn hụt).
// itemPlaceholder: nhãn ô tra cứu đổi theo loại chứng từ (mua dịch vụ → "Mã dịch vụ").
export async function fillFirstItemLine(
  page: Page,
  itemCode: string,
  unitPrice: string,
  itemPlaceholder = 'Mã hàng',
) {
  const row = page.locator('table tbody tr').first()
  const itemInput = row.getByPlaceholder(itemPlaceholder)
  await itemInput.click()
  // Panel picker tự đóng khi có scroll (listener capture) — race không tránh được
  // bằng 1 lượt gõ. Retry: xóa keyword + gõ lại (ký tự đầu tự mở lại panel qua onChange),
  // rồi click cell mã hàng. Scope theo [data-picker-panel] (panel portal ra body):
  // ô nhập trên dòng hàng cũng là cell có accessible name = giá trị đã gõ → strict violation
  // nếu tra cell trên toàn page.
  const cell = page
    .locator('[data-picker-panel]')
    .getByRole('cell', { name: itemCode, exact: true })
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
  // Ô Đơn giá định vị THEO CỘT, không lấy placeholder "0" đầu dòng: bảng bán hàng
  // có cột "CK thương mại" đứng trước Đơn giá → điền nhầm thành chiết khấu (tổng tiền âm).
  // row = dòng đầu của bảng đầu tiên → header cùng bảng đó.
  const headers = await page.locator('table').first().locator('thead th').allInnerTexts()
  // innerText áp text-transform (header uppercase) → so không phân biệt hoa thường.
  const priceIdx = headers.findIndex(
    (h) => h.replace(/\s+/g, ' ').trim().toLowerCase() === 'đơn giá',
  )
  const priceCell =
    priceIdx >= 0
      ? row.locator('td').nth(priceIdx).locator('input')
      : row.getByPlaceholder('0').first()
  await priceCell.fill(unitPrice)
}

// Mở menu "Thao tác khác" của dòng chứa voucherNo rồi click 1 mục.
// Menu render trong portal trên document.body → item locate trên page, không scope theo row.
export async function rowMenuAction(page: Page, voucherNo: string, item: string) {
  const row = page.locator('tbody tr', { hasText: voucherNo })
  // Danh sách có thể refetch ngay sau khi mở menu → item detach giữa chừng. Retry cả khối.
  await expect(async () => {
    const menuBtn = row.getByLabel('Thao tác khác')
    if ((await menuBtn.getAttribute('aria-expanded')) !== 'true') await menuBtn.click()
    await page.getByRole('menuitem', { name: item, exact: true }).click({ timeout: 2000 })
  }).toPass({ timeout: 15_000 })
}
