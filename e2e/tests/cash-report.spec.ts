import { test, expect } from '@playwright/test'

test.describe('Tiền mặt — báo cáo', () => {
  test('tab Báo cáo liệt kê các báo cáo tiền mặt', async ({ page }) => {
    await page.goto('/cash?tab=report')

    await expect(page.getByPlaceholder('Tìm theo tên báo cáo')).toBeVisible()
    await expect(page.getByText('S03a1-DNN: Sổ nhật ký thu tiền')).toBeVisible()
    await expect(page.getByText('Sổ kế toán chi tiết quỹ tiền mặt')).toBeVisible()
  })
})
