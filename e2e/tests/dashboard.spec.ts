import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('trang chủ hiển thị tab Tổng quan', async ({ page }) => {
    await page.goto('/')
    const tab = page.getByRole('button', { name: 'Tổng quan' })
    await expect(tab).toBeVisible()
    await expect(tab).toHaveAttribute('aria-selected', 'true')
  })
})
