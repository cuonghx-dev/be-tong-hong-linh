import { test, expect } from '@playwright/test'
import { ADMIN } from '../helpers/form'

// Spec này kiểm tra luồng CHƯA đăng nhập → không dùng storageState admin.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Đăng nhập', () => {
  test('sai mật khẩu → báo lỗi', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('Email').fill(ADMIN.email)
    await page.getByPlaceholder('Mật khẩu').fill('sai-mat-khau')
    await page.getByRole('button', { name: 'Đăng nhập' }).click()

    await expect(page.getByRole('alert')).toHaveText('Email hoặc mật khẩu không đúng')
    await expect(page).toHaveURL(/\/login/)
  })

  test('chưa đăng nhập vào /cash → chuyển về trang login', async ({ page }) => {
    await page.goto('/cash')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
  })
})
