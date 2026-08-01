import { test, expect } from '@playwright/test'

// Tutorial "Bắt đầu sử dụng" — checklist thiết lập ban đầu, tick theo dữ liệu thật.
test.describe('Tutorial bắt đầu sử dụng', () => {
  test('tự bật ở Tổng quan và liệt kê 5 bước', async ({ page }) => {
    await page.goto('/')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Bắt đầu sử dụng phần mềm')).toBeVisible()
    for (const label of [
      'Bước 1: Người dùng và thiết lập',
      'Bước 2: Khai báo danh mục',
      'Bước 3: Nhập số dư ban đầu',
      'Bước 4: Lập chứng từ',
      'Bước 5: Xem báo cáo',
    ]) {
      await expect(dialog.getByRole('button', { name: new RegExp(label) })).toBeVisible()
    }
    // Tiến độ tổng — DB test có seed danh mục nên phải > 0 việc đã xong.
    await expect(dialog.getByText(/\d+\/\d+ việc/)).toBeVisible()
  })

  test('bấm "Làm ngay" mở đúng màn hình và đóng tutorial', async ({ page }) => {
    await page.goto('/')
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /Bước 4/ }).click()
    await dialog
      .getByRole('listitem')
      .filter({ hasText: 'Lập phiếu thu tiền mặt' })
      .getByRole('button')
      .click()
    await expect(page).toHaveURL(/\/cash\/vouchers\/new\?type=RECEIPT/)
    await expect(dialog).toBeHidden()
  })

  test('"Không hiện lại" tắt tự bật, nút Trợ giúp mở lại được', async ({ page }) => {
    await page.goto('/')
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Không hiện lại' }).click()
    await expect(dialog).toBeHidden()

    await page.reload()
    await expect(page.getByRole('tab', { name: 'Tổng quan' })).toBeVisible()
    await expect(dialog).toBeHidden()

    await page.getByTitle('Bắt đầu sử dụng phần mềm').click()
    await expect(dialog).toBeVisible()
  })
})
