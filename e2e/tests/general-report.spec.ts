import { test, expect } from '@playwright/test'

test.describe('Tổng hợp — báo cáo', () => {
  test('mở sổ nhật ký chung', async ({ page }) => {
    await page.goto('/general?tab=report')
    await expect(page.getByPlaceholder('Tìm theo tên báo cáo')).toBeVisible()
    await page.getByText('S03a-DNN: Sổ nhật ký chung').click()
    await expect(page).toHaveURL(/\/general\/reports\/general-journal/)
    // Trang báo cáo có bộ lọc kỳ.
    await expect(page.getByText('Từ ngày')).toBeVisible()
    await expect(page.getByText('Đến ngày')).toBeVisible()
  })
})
