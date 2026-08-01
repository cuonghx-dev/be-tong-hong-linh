import { test as setup, expect } from '@playwright/test'
import { ADMIN } from '../helpers/form'

// Login admin qua UI 1 lần, lưu storageState (Zustand persist trong localStorage
// key `ke-toan-auth`) cho mọi spec của project chromium.
setup('đăng nhập admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByPlaceholder('Email').fill(ADMIN.email)
  await page.getByPlaceholder('Mật khẩu').fill(ADMIN.password)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()

  // Về trang chủ — widget dashboard hiển thị. Dùng locator theo text (không theo role)
  // vì tutorial "Bắt đầu sử dụng" có thể tự bật: dialog aria-modal ẩn phần còn lại
  // của trang khỏi accessibility tree.
  await page.waitForURL('/')
  await expect(page.getByText('Tình hình tài chính')).toBeVisible()

  // KHÔNG bấm "Không hiện lại" — storageState giữ nguyên để spec onboarding test được tự bật.
  await page.context().storageState({ path: '.auth/admin.json' })
})
