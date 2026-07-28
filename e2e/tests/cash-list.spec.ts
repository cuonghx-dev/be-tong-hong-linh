import { test, expect } from '@playwright/test'

test.describe('Tiền mặt — danh sách', () => {
  test('tab Thu, chi tiền hiển thị bảng chứng từ', async ({ page }) => {
    await page.goto('/cash?tab=txn')

    // Header bảng (text chứa &nbsp; → match bằng regex).
    await expect(page.getByRole('columnheader', { name: /Số chứng.?từ/ })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Diễn.?giải/ })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Số.?tiền/ })).toBeVisible()

    // Toolbar + footer phân trang.
    // exact — header app cũng có ô "Tìm kiếm chứng từ, đối tượng…".
    await expect(page.getByPlaceholder('Tìm kiếm', { exact: true })).toBeVisible()
    await expect(page.getByText(/Tổng số:/)).toBeVisible()
  })
})
