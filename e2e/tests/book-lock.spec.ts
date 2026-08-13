import { test, expect, type Page } from '@playwright/test'
import { fillAccount } from '../helpers/account'
import { fieldInput } from '../helpers/form'

// Khóa sổ đến hôm nay (node quy trình bên Tổng hợp).
async function lockBooks(page: Page) {
  await page.goto('/general?tab=process')
  // exact — không exact thì "Khóa sổ kỳ kế toán" match luôn cả "BỎ khóa sổ kỳ kế toán".
  await page.getByRole('button', { name: 'Khóa sổ kỳ kế toán', exact: true }).first().click()
  // Chờ menu node mở thật (item "Bỏ khóa sổ" chỉ có trong menu) rồi mới click item
  // (node + item menu trùng tên → item = match cuối).
  await expect(page.getByRole('button', { name: 'Bỏ khóa sổ kỳ kế toán' })).toBeVisible()
  await page.getByRole('button', { name: 'Khóa sổ kỳ kế toán', exact: true }).last().click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Khóa sổ kỳ kế toán' })).toBeVisible()
  const today = new Date().toISOString().slice(0, 10)
  await dialog.locator('input[type=date]').fill(today)
  await dialog.getByRole('button', { name: 'Khóa sổ', exact: true }).click()
  await expect(page.getByText('Đã khóa sổ', { exact: true })).toBeVisible()
}

async function unlockBooks(page: Page) {
  await page.goto('/general?tab=process')
  await page.getByRole('button', { name: 'Khóa sổ kỳ kế toán' }).first().click()
  await expect(page.getByRole('button', { name: 'Bỏ khóa sổ kỳ kế toán' })).toBeVisible()
  await page.getByRole('button', { name: 'Bỏ khóa sổ kỳ kế toán' }).click()
  const confirm = page.getByRole('alertdialog')
  await expect(confirm).toContainText('Bỏ khóa sổ kỳ kế toán')
  await confirm.getByRole('button', { name: 'Bỏ khóa sổ', exact: true }).click()
  await expect(page.getByText('Đã bỏ khóa sổ kỳ kế toán')).toBeVisible()
}

// Khóa sổ chặn ghi chứng từ trong kỳ đã khóa, rồi bỏ khóa để không ảnh hưởng spec khác.
test.describe('Khóa sổ kỳ kế toán', () => {
  test('khóa sổ chặn tạo chứng từ, bỏ khóa mở lại', async ({ page }) => {
    // 1. Khóa sổ đến hôm nay.
    await lockBooks(page)

    // 2. Tạo phiếu thu ngày hôm nay → backend từ chối (400 khóa sổ).
    await page.goto('/cash/vouchers/new?type=RECEIPT')
    await expect(page.getByRole('heading', { name: 'Phiếu thu' })).toBeVisible()
    await fieldInput(page, 'Lý do nộp').fill('Phiếu bị chặn bởi khóa sổ')
    await page.locator('table tbody tr').first().getByPlaceholder('0').fill('10000')
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page.getByText('Lưu chứng từ thất bại')).toBeVisible()
    await expect(page.getByText(/Đã khóa sổ đến ngày/)).toBeVisible()

    // 3. Bỏ khóa sổ.
    await unlockBooks(page)
  })

  test('khóa sổ chặn cả chứng từ nghiệp vụ khác (NVK)', async ({ page }) => {
    // Guard khóa sổ phải phủ mọi module ghi — không chỉ tiền mặt.
    await lockBooks(page)

    await page.goto('/general/vouchers/new')
    await expect(page.getByRole('heading', { name: /Chứng từ nghiệp vụ khác/ })).toBeVisible()
    const row = page.getByTestId('general-entry-table').locator('tbody tr').first()
    await fillAccount(page, row.locator('input').nth(1), '642')
    await fillAccount(page, row.locator('input').nth(2), '1111')
    await row.getByPlaceholder('0').first().fill('50000')
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()

    await expect(page.getByText('Lưu chứng từ thất bại')).toBeVisible()
    await expect(page.getByText(/Đã khóa sổ đến ngày/)).toBeVisible()
    await expect(page).toHaveURL(/\/general\/vouchers\/new/)

    await unlockBooks(page)
  })
})
