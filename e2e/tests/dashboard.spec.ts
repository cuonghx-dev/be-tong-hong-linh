import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('trang chủ hiển thị tab Tổng quan', async ({ page }) => {
    await page.goto('/')
    // Tutorial "Bắt đầu sử dụng" tự bật ở trang chủ; dialog aria-modal ẩn phần còn lại
    // khỏi accessibility tree nên phải đóng trước khi query theo role.
    await page.getByRole('button', { name: 'Để sau' }).click()
    const tab = page.getByRole('tab', { name: 'Tổng quan' })
    await expect(tab).toBeVisible()
    await expect(tab).toHaveAttribute('aria-selected', 'true')
  })
})
