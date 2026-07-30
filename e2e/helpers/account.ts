import { expect, type Locator, type Page } from '@playwright/test'

// AccountPicker: gõ số TK, chờ panel lọc rồi Enter chọn dòng khớp đầu tiên
// (Escape sẽ đóng panel mà KHÔNG chốt giá trị — phải Enter/blur).
export async function fillAccount(page: Page, input: Locator, accountNo: string) {
  await input.click()
  await input.press('ControlOrMeta+a')
  await input.press('Backspace')
  await input.pressSequentially(accountNo)
  await page.waitForTimeout(300)
  await page.keyboard.press('Enter')
  await expect(input).toHaveValue(accountNo)
}

// WarehousePicker: danh mục kho nhỏ, gõ mã rồi Enter là đủ (không debounce server).
export async function fillWarehouse(row: Locator, code = 'KHO') {
  const input = row.getByPlaceholder('Mã kho')
  await input.click()
  await input.fill(code)
  await input.press('Enter')
  await expect(input).not.toHaveValue('')
}
