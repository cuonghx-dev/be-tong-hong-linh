import { test, expect } from '@playwright/test'
import { fieldInputIn, fieldSelectIn, selectValue } from '../helpers/form'

const VIEWER = { email: 'viewer@e2e.vn', name: 'Giám đốc E2E', password: 'viewer123' }

test.describe('Phân quyền', () => {
  test('vai trò Giám đốc (viewer) chỉ xem — không có nút Thêm', async ({ page, browser }) => {
    // Admin tạo user viewer (nếu chưa có).
    await page.goto('/settings/users')
    await expect(page.getByRole('heading', { name: 'Người dùng' })).toBeVisible()
    // Chờ list load xong (row admin luôn có) rồi mới kiểm tra viewer tồn tại.
    await expect(page.locator('tbody tr', { hasText: 'admin@ketoan.vn' })).toBeVisible()
    if (!(await page.locator('tbody tr', { hasText: VIEWER.email }).count())) {
      await page.getByRole('button', { name: 'Thêm người dùng' }).click()
      const dialog = page.getByRole('dialog')
      await fieldInputIn(dialog, page, 'Email').fill(VIEWER.email)
      await fieldInputIn(dialog, page, 'Họ tên').fill(VIEWER.name)
      await selectValue(page, fieldSelectIn(dialog, page, 'Vai trò'), 'Giám đốc')
      await fieldInputIn(dialog, page, 'Mật khẩu').fill(VIEWER.password)
      await fieldInputIn(dialog, page, 'Nhập lại mật khẩu').fill(VIEWER.password)
      await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
      await expect(dialog).toBeHidden()
    }

    // Đăng nhập viewer trong context sạch (không dùng storageState admin).
    const ctx = await browser.newContext()
    const viewerPage = await ctx.newPage()
    await viewerPage.goto('http://localhost:5111/login')
    await viewerPage.getByPlaceholder('Email').fill(VIEWER.email)
    await viewerPage.getByPlaceholder('Mật khẩu').fill(VIEWER.password)
    await viewerPage.getByRole('button', { name: 'Đăng nhập' }).click()
    await expect(viewerPage.getByRole('tab', { name: 'Tổng quan' })).toBeVisible()

    // Viewer đọc được danh sách nhưng không có nút Thêm / thao tác ghi.
    await viewerPage.goto('http://localhost:5111/cash?tab=txn')
    await expect(viewerPage.getByRole('columnheader', { name: /Số chứng.?từ/ })).toBeVisible()
    await expect(viewerPage.getByRole('button', { name: 'Thêm', exact: true })).toBeHidden()

    // Không có quyền users → không vào được trang Người dùng (redirect về trang chủ).
    await viewerPage.goto('http://localhost:5111/settings/users')
    await expect(viewerPage.getByRole('heading', { name: 'Người dùng' })).toBeHidden()

    await ctx.close()
  })
})
