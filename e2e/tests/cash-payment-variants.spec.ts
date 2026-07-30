import { test, expect, type Page } from '@playwright/test'
import { fillAccount } from '../helpers/account'
import { fieldInput } from '../helpers/form'

// Form phiếu chi biến thể theo loại nghiệp vụ (theo form MISA):
// - Định khoản mặc định từng loại (map @app/shared + override Chi khác trống)
// - Trả lương tạm ứng: đối tượng là nhân viên (header + cột bảng Mã/Tên nhân viên)
// - Gửi tiền vào NH: không có trường Nhân viên, cột TK ngân hàng
// - Chi mua ngoài có hóa đơn: bảng "Kê khai hóa đơn và hạch toán thuế" (dòng thuế 1331)

// Mở form phiếu chi mới (route trực tiếp — nhanh hơn đi qua AddMenu) + chọn loại nghiệp vụ.
async function openPaymentForm(page: Page, category?: string) {
  await page.goto('/cash/vouchers/new?type=PAYMENT')
  await expect(page.getByRole('heading', { name: 'Phiếu chi' })).toBeVisible()
  if (category) {
    // exact — "Tạm ứng cho nhân viên" là substring của "Trả lương tạm ứng cho nhân viên".
    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: category, exact: true }).click()
  }
}

// Ô TK Nợ / TK Có của dòng hạch toán đầu (input thứ 2/3 trong dòng, sau Diễn giải).
const firstLine = (page: Page) => page.locator('table tbody tr').first()
// Bảng thuế GTGT = bảng thứ 2 của form (Chi mua ngoài có hóa đơn); dòng đầu.
const taxLine = (page: Page) => page.locator('table').nth(1).locator('tbody tr').first()
const debitInput = (page: Page) => firstLine(page).locator('input').nth(1)
const creditInput = (page: Page) => firstLine(page).locator('input').nth(2)

test.describe('Tiền mặt — form phiếu chi theo loại nghiệp vụ', () => {
  test('định khoản mặc định đúng theo từng loại nghiệp vụ', async ({ page }) => {
    await openPaymentForm(page)
    const CASES: [string, string, string][] = [
      ['Tạm ứng cho nhân viên', '141', '1111'],
      ['Chi mua ngoài có hóa đơn', '', '1111'],
      ['Gửi tiền vào ngân hàng', '1121', '1111'],
      ['Trả lương tạm ứng cho nhân viên', '3341', '1111'],
      ['Chi khác', '', '1111'], // MISA để TK Nợ trống cho tự nhập
    ]
    for (const [label, debit, credit] of CASES) {
      await page.getByRole('combobox').first().click()
      await page.getByRole('option', { name: label, exact: true }).click()
      await expect(debitInput(page)).toHaveValue(debit)
      await expect(creditInput(page)).toHaveValue(credit)
    }
  })

  test('trả lương tạm ứng: đối tượng là nhân viên, lưu được phiếu', async ({ page }) => {
    await openPaymentForm(page, 'Trả lương tạm ứng cho nhân viên')

    // Header đổi thành Mã/Tên nhân viên, KHÔNG còn trường Nhân viên riêng.
    await expect(page.locator('label').filter({ hasText: /^Mã nhân viên$/ })).toBeVisible()
    await expect(page.locator('label').filter({ hasText: /^Tên nhân viên$/ })).toBeVisible()
    await expect(page.locator('label').filter({ hasText: /^Nhân viên$/ })).toHaveCount(0)
    // Cột bảng hạch toán cũng theo nhân viên.
    await expect(page.getByRole('columnheader', { name: 'Mã nhân viên' })).toBeVisible()

    const voucherNo = await fieldInput(page, 'Số phiếu chi').inputValue()
    await firstLine(page).getByPlaceholder('0').fill('5000000')
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page).toHaveURL(/\/cash(?!\/vouchers)/)

    await page.goto('/cash?tab=txn')
    const row = page.locator('tbody tr', { hasText: voucherNo })
    await expect(row).toContainText('Trả lương tạm ứng cho nhân viên')
    await expect(row).toContainText('5.000.000')
  })

  test('gửi tiền vào ngân hàng: không có trường Nhân viên, có cột TK ngân hàng', async ({ page }) => {
    await openPaymentForm(page, 'Gửi tiền vào ngân hàng')
    await expect(page.locator('label').filter({ hasText: /^Nhân viên$/ })).toHaveCount(0)
    await expect(page.getByRole('columnheader', { name: 'TK ngân hàng' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Tên ngân hàng' })).toBeVisible()
  })

  test('chi mua ngoài có hóa đơn: kê khai thuế GTGT, tổng tiền gộp thuế', async ({ page }) => {
    await openPaymentForm(page, 'Chi mua ngoài có hóa đơn')

    // Cột Khoản mục CP + bảng kê khai thuế (2 bảng cùng trang, không còn tab).
    await expect(page.getByRole('columnheader', { name: 'Khoản mục CP' })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Kê khai hóa đơn và hạch toán thuế' }),
    ).toBeVisible()

    const voucherNo = await fieldInput(page, 'Số phiếu chi').inputValue()
    await fieldInput(page, 'Lý do chi').fill('Chi mua ngoài E2E')
    await fillAccount(page, debitInput(page), '642')
    await firstLine(page).getByPlaceholder('0').fill('1000000')

    // Bảng thuế: đổi thuế suất 10 → 8 tự gợi ý tiền thuế = 1.000.000 × 8% = 80.000.
    await taxLine(page).locator('input[type=number]').fill('8')
    await expect(taxLine(page).getByPlaceholder('0').first()).toHaveValue('80.000')
    await expect(page.getByText('1.080.000').first()).toBeVisible() // Tổng tiền = hàng + thuế

    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page).toHaveURL(/\/cash(?!\/vouchers)/)

    await page.goto('/cash?tab=txn')
    const row = page.locator('tbody tr', { hasText: voucherNo })
    await expect(row).toContainText('1.080.000')

    // Xem phiếu: dòng thuế nằm bảng thuế, bảng Hạch toán không lẫn TK 1331.
    await row.getByRole('button', { name: 'Xem' }).click()
    await expect(page.getByRole('heading', { name: /Xem phiếu chi/ })).toBeVisible()
    await expect(page.locator('table').first().locator('tbody')).not.toContainText('1331')
    await expect(taxLine(page).getByPlaceholder('0').first()).toHaveValue('80.000')
    await expect(page.getByRole('columnheader', { name: 'Số hóa đơn' })).toBeVisible()
  })
})
