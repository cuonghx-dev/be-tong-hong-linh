import { test as setup, expect } from '@playwright/test'
import { ADMIN } from '../helpers/form'

// Login admin qua UI 1 lần, lưu storageState (Zustand persist trong localStorage
// key `ke-toan-auth`) cho mọi spec của project chromium.
setup('đăng nhập admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByPlaceholder('Email').fill(ADMIN.email)
  await page.getByPlaceholder('Mật khẩu').fill(ADMIN.password)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()

  // Về trang chủ — tab Tổng quan của dashboard hiển thị.
  await expect(page.getByRole('button', { name: 'Tổng quan' })).toBeVisible()

  await page.context().storageState({ path: '.auth/admin.json' })
})
