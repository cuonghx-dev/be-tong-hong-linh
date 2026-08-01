import { test, expect } from '@playwright/test'
import { fieldInputIn } from '../helpers/form'

test.describe('Danh mục', () => {
  test('trang hub liệt kê các danh mục', async ({ page }) => {
    await page.goto('/catalog')
    await expect(page.getByRole('heading', { name: 'Danh mục' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Đơn vị tính' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Khách hàng', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Hệ thống tài khoản' })).toBeVisible()
  })

  test('thêm rồi xóa đơn vị tính', async ({ page }) => {
    // Tên unique mỗi run — tránh đụng leftover khi chạy lặp dev loop (full run reset DB).
    const NAME = `Thùng E2E ${Date.now()}`
    const row = page.locator('tbody tr', { hasText: NAME })
    // Danh sách phân trang — tìm kiếm để thấy bản ghi mới.
    const search = async () => {
      await page.getByPlaceholder('Tìm kiếm', { exact: true }).fill(NAME)
      await page.getByPlaceholder('Tìm kiếm', { exact: true }).press('Enter')
    }

    await page.goto('/catalog/don-vi-tinh')
    await expect(page.getByRole('heading', { name: 'Đơn vị tính' })).toBeVisible()

    // Thêm mới qua AddMenu.
    await page.getByRole('button', { name: 'Thêm', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Đơn vị tính', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Thông tin đơn vị tính')).toBeVisible()
    await fieldInputIn(dialog, page, 'Đơn vị tính').fill(NAME)
    await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(dialog).toBeHidden()

    await search()
    await expect(row).toBeVisible()
    await expect(row.getByText('Đang sử dụng')).toBeVisible()

    // Xóa qua RowActionMenu + confirm. List có thể refetch làm menu detach — retry cả khối.
    await expect(async () => {
      const menuBtn = row.getByLabel('Thao tác khác')
      if (await menuBtn.getAttribute('aria-expanded') !== 'true') await menuBtn.click()
      await page.getByRole('menuitem', { name: 'Xóa', exact: true }).click({ timeout: 2000 })
    }).toPass({ timeout: 15_000 })
    await expect(page.getByRole('alertdialog')).toContainText(`Xóa đơn vị tính ${NAME}?`)
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xóa', exact: true }).click()
    await expect(row).toBeHidden()
  })
})
