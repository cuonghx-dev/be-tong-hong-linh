import type { Page } from '@playwright/test'

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

export const ADMIN = { email: 'admin@ketoan.vn', password: 'admin123' }
