import { test, expect } from '@playwright/test'

test.describe('Số dư ban đầu', () => {
  test('trang hub liệt kê các mục khai báo', async ({ page }) => {
    await page.goto('/opening-balance')
    await expect(page.getByRole('heading', { name: 'Nhập số dư ban đầu' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Số dư tài khoản', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Công nợ khách hàng' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tồn kho vật tư, hàng hóa và CCDC' })).toBeVisible()
  })

  test('bảng số dư tài khoản render dữ liệu seed', async ({ page }) => {
    await page.goto('/opening-balance/so-du-tai-khoan')
    await expect(page.getByRole('heading', { name: 'Số dư tài khoản' })).toBeVisible()
    // Seed nạp 28 TK theo spec MISA (dư 0) — TK 111 phải có mặt
    // (cell đầu chứa cả nút Thu gọn/Mở rộng → match theo row).
    await expect(page.getByRole('row', { name: /111 Tiền mặt/ })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Dư.?Nợ/ })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Dư.?Có/ })).toBeVisible()
  })
})
