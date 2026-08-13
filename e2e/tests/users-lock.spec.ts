import { test, expect } from '@playwright/test'
import { fieldInputIn, fieldSelectIn, selectValue } from '../helpers/form'

const TARGET = { email: 'khoa@e2e.vn', name: 'User bị khóa E2E', password: 'khoa1234' }

// Khóa tài khoản chặn đăng nhập; mở khóa cho đăng nhập lại (bảo mật quản trị).
test.describe('Người dùng — khóa / mở khóa tài khoản', () => {
  test('khóa tài khoản chặn đăng nhập, mở khóa đăng nhập lại được', async ({ page, browser }) => {
    // Admin tạo user đích (nếu chưa có).
    await page.goto('/settings/users')
    await expect(page.locator('tbody tr', { hasText: 'admin@ketoan.vn' })).toBeVisible()
    if (!(await page.locator('tbody tr', { hasText: TARGET.email }).count())) {
      await page.getByRole('button', { name: 'Thêm người dùng' }).click()
      const dialog = page.getByRole('dialog')
      await fieldInputIn(dialog, page, 'Email').fill(TARGET.email)
      await fieldInputIn(dialog, page, 'Họ tên').fill(TARGET.name)
      await selectValue(page, fieldSelectIn(dialog, page, 'Vai trò'), 'Kế toán')
      await fieldInputIn(dialog, page, 'Mật khẩu').fill(TARGET.password)
      await fieldInputIn(dialog, page, 'Nhập lại mật khẩu').fill(TARGET.password)
      await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
      await expect(dialog).toBeHidden()
    }

    const row = page.locator('tbody tr', { hasText: TARGET.email })

    // Khóa qua row menu + confirm destructive.
    await row.getByLabel('Thao tác khác').click()
    await page.getByRole('menuitem', { name: 'Khóa tài khoản', exact: true }).click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toContainText(`Khóa tài khoản ${TARGET.email}?`)
    await confirm.getByRole('button', { name: 'Khóa', exact: true }).click()
    await expect(row.getByText('Đã khóa')).toBeVisible()

    // Đăng nhập bằng user bị khóa trong context sạch → bị từ chối, ở lại /login.
    const ctx = await browser.newContext()
    const lockedPage = await ctx.newPage()
    await lockedPage.goto('http://localhost:5111/login')
    await lockedPage.getByPlaceholder('Email').fill(TARGET.email)
    await lockedPage.getByPlaceholder('Mật khẩu').fill(TARGET.password)
    await lockedPage.getByRole('button', { name: 'Đăng nhập' }).click()
    await expect(lockedPage).toHaveURL(/\/login/)
    await expect(lockedPage.getByRole('tab', { name: 'Tổng quan' })).toBeHidden()
    await ctx.close()

    // Mở khóa (không cần confirm) → trạng thái Hoạt động.
    await row.getByLabel('Thao tác khác').click()
    await page.getByRole('menuitem', { name: 'Mở khóa', exact: true }).click()
    await expect(row.getByText('Hoạt động')).toBeVisible()
  })
})
