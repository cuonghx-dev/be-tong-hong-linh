import { expect, type Locator, type Page } from '@playwright/test'

// Label trên form chứng từ không có htmlFor → getByLabel không dùng được.
// Định vị theo container Field (div.space-y-1 chứa <label> đúng text) rồi lấy input/textarea đầu tiên.
export function fieldInput(page: Page, label: string) {
  return page
    .locator('div.space-y-1', { has: page.locator('label', { hasText: label }) })
    .locator('input, textarea, select')
    .first()
}

// Như fieldInput nhưng scope trong 1 container (vd. dialog) thay vì cả page.
export function fieldInputIn(scope: ReturnType<Page['locator']>, page: Page, label: string) {
  return scope
    .locator('div.space-y-1', { has: page.locator('label', { hasText: label }) })
    .locator('input, textarea, select')
    .first()
}

// Select = shadcn/Radix (không phải <select> native) → mở trigger rồi click option
// trong listbox (render qua portal ở body, ngoài scope của dialog/form).
export async function selectValue(page: Page, trigger: Locator, option: string | { index: number }) {
  await trigger.click()
  const listbox = page.getByRole('listbox')
  await listbox.waitFor()
  const item =
    typeof option === 'string'
      ? listbox.getByRole('option', { name: option, exact: true })
      : listbox.getByRole('option').nth(option.index)
  await item.click()
  await listbox.waitFor({ state: 'hidden' })
}

// Trigger của Select trong 1 Field (label không có htmlFor — xem fieldInput).
export function fieldSelectIn(scope: Locator, page: Page, label: string) {
  return scope
    .locator('div.space-y-1', { has: page.locator('label', { hasText: label }) })
    .getByRole('combobox')
    .first()
}

// Ô "Số chứng từ" hiện 'Tự động'/'…' tới khi query nextNo trả về — đọc sớm dính race.
// Chờ có số thật rồi mới trả về.
export async function readVoucherNo(page: Page, label = 'Số chứng từ') {
  const input = fieldInput(page, label)
  await expect(input).not.toHaveValue(/^(Tự động|…)?$/)
  return input.inputValue()
}

export const ADMIN = { email: 'admin@ketoan.vn', password: 'admin123' }
