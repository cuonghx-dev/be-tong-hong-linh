import { test, expect } from '@playwright/test'
import { fieldInputIn } from '../helpers/form'

test.describe('Người dùng', () => {
  test('danh sách hiển thị admin', async ({ page }) => {
    await page.goto('/settings/users')
    await expect(page.getByRole('heading', { name: 'Người dùng' })).toBeVisible()
    const row = page.locator('tbody tr', { hasText: 'admin@ketoan.vn' })
    await expect(row).toContainText('Quản trị')
    await expect(row).toContainText('Hoạt động')
  })

  test('thêm người dùng kế toán', async ({ page }) => {
    // Email unique mỗi run — tránh đụng leftover khi chạy lặp dev loop.
    const email = `ketoan-${Date.now()}@e2e.vn`
    await page.goto('/settings/users')
    await page.getByRole('button', { name: 'Thêm người dùng' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Thêm người dùng')).toBeVisible()
    await fieldInputIn(dialog, page, 'Email').fill(email)
    await fieldInputIn(dialog, page, 'Họ tên').fill('Kế toán E2E')
    await fieldInputIn(dialog, page, 'Vai trò').selectOption({ label: 'Kế toán' })
    await fieldInputIn(dialog, page, 'Mật khẩu').fill('ketoan123')
    await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(dialog).toBeHidden()

    const row = page.locator('tbody tr', { hasText: email })
    await expect(row).toContainText('Kế toán')
    await expect(row).toContainText('Hoạt động')
  })
})
