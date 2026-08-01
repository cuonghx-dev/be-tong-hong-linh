import { test, expect, type Page } from '@playwright/test'
import { fillAccount } from '../helpers/account'
import { fieldInput } from '../helpers/form'
import { rowMenuAction } from '../helpers/voucher'

// Chứng từ nghiệp vụ khác (NVK) — form MISA: hạn thanh toán ở thông tin chung,
// dòng hạch toán có Nghiệp vụ + đối tượng vế Nợ và vế Có (§ docs/misa-specs).

// Form có 2 bảng (tab Hạch toán / tab Kê khai hóa đơn) → luôn scope theo testid.
const entryTable = (page: Page) => page.getByTestId('general-entry-table')
const taxTable = (page: Page) => page.getByTestId('general-tax-table')
const firstRow = (page: Page) => entryTable(page).locator('tbody tr').first()
// Dòng hạch toán: [diễn giải, TK Nợ, TK Có, số tiền, (select nghiệp vụ),
// đối tượng Nợ, tên đối tượng Nợ, đối tượng Có, tên đối tượng Có].
const debitCell = (page: Page) => firstRow(page).locator('input').nth(1)
const creditCell = (page: Page) => firstRow(page).locator('input').nth(2)
const amountCell = (page: Page) => firstRow(page).getByPlaceholder('0').first()

async function openNewGeneralVoucher(page: Page) {
  await page.goto('/general/vouchers/new')
  await expect(page.getByRole('heading', { name: /Chứng từ nghiệp vụ khác/ })).toBeVisible()
}

test.describe('Tổng hợp — chứng từ nghiệp vụ khác', () => {
  test('tạo NVK với hạn thanh toán, nghiệp vụ và đối tượng', async ({ page }) => {
    await openNewGeneralVoucher(page)

    const noInput = fieldInput(page, 'Số chứng từ')
    await expect(noInput).toHaveValue(/^NVK/)
    const voucherNo = await noInput.inputValue()

    await fieldInput(page, 'Diễn giải').fill('Bút toán NVK E2E')
    await fieldInput(page, 'Hạn thanh toán').fill('2026-12-31')

    // NVK không có định khoản mặc định — TK Nợ/Có tự nhập, phải khác nhau (backend chặn).
    await expect(debitCell(page)).toHaveValue('')
    await expect(creditCell(page)).toHaveValue('')
    await fillAccount(page, debitCell(page), '1121')
    await fillAccount(page, creditCell(page), '1111')
    await amountCell(page).fill('5000000')
    await expect(amountCell(page)).toHaveValue('5.000.000')

    await firstRow(page).locator('select').selectOption({ label: 'Giảm giá hàng bán' })
    await firstRow(page).locator('input').nth(4).fill('Tên đối tượng Nợ E2E')

    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page).toHaveURL(/\/general(?!\/vouchers)/)

    await page.goto('/general?tab=other-voucher')
    const row = page.locator('tbody tr', { hasText: voucherNo })
    await expect(row).toContainText('Bút toán NVK E2E')
    await expect(row).toContainText('5.000.000')
  })

  test('dòng mới kế thừa diễn giải header', async ({ page }) => {
    await openNewGeneralVoucher(page)
    await fieldInput(page, 'Diễn giải').fill('Diễn giải kế thừa')
    await page.getByRole('button', { name: 'Thêm dòng' }).click()

    const rows = entryTable(page).locator('tbody tr')
    await expect(rows).toHaveCount(2)
    // Header đổi → điền xuống MỌI dòng hạch toán, dòng kê khai thành "Thuế GTGT - …".
    await expect(rows.nth(0).locator('input').first()).toHaveValue('Diễn giải kế thừa')
    await expect(rows.nth(1).locator('input').first()).toHaveValue('Diễn giải kế thừa')
    await expect(taxTable(page).locator('tbody tr').first().locator('input').first()).toHaveValue(
      'Thuế GTGT - Diễn giải kế thừa',
    )
  })

  test('TK Nợ trùng TK Có → backend chặn, ở lại form', async ({ page }) => {
    await openNewGeneralVoucher(page)
    await fillAccount(page, debitCell(page), '1111')
    await fillAccount(page, creditCell(page), '1111')
    await amountCell(page).fill('100000')

    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page.getByText('Lưu chứng từ thất bại')).toBeVisible()
    await expect(page).toHaveURL(/\/general\/vouchers\/new/)
  })

  test('kê khai hóa đơn: tự tính tiền thuế và lưu kèm chứng từ', async ({ page }) => {
    await openNewGeneralVoucher(page)
    await fieldInput(page, 'Diễn giải').fill('NVK kê khai thuế E2E')
    const voucherNo = await fieldInput(page, 'Số chứng từ').inputValue()

    await fillAccount(page, debitCell(page), '1331')
    await fillAccount(page, creditCell(page), '3331')
    await amountCell(page).fill('1000000')

    // Sang tab kê khai — dòng mặc định "Thuế GTGT - <diễn giải>", TK 1331.
    await page.getByRole('tab', { name: 'Kê khai hóa đơn và hạch toán thuế' }).click()
    const taxRow = taxTable(page).locator('tbody tr').first()
    await expect(taxRow.locator('input').first()).toHaveValue(/Thuế GTGT/)

    await taxRow.locator('select').selectOption({ label: 'Tăng thuế đầu vào' })
    // Giá trị HHDV chưa thuế + % thuế → tiền thuế tự tính (10.000.000 × 10%).
    await taxRow.getByPlaceholder('0').first().fill('10000000')
    await taxRow.locator('input[type=number]').fill('10')
    await expect(taxRow.getByPlaceholder('0').nth(1)).toHaveValue('1.000.000')
    await taxRow.locator('input[type=date]').fill('2026-06-29')

    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page).toHaveURL(/\/general(?!\/vouchers)/)

    // Mở lại chứng từ → dòng kê khai được nạp đúng (không cộng vào tổng tiền chứng từ).
    await page.goto('/general?tab=other-voucher')
    await rowMenuAction(page, voucherNo, 'Sửa')
    await page.getByRole('tab', { name: 'Kê khai hóa đơn và hạch toán thuế' }).click()
    const savedRow = taxTable(page).locator('tbody tr').first()
    await expect(savedRow.getByPlaceholder('0').nth(1)).toHaveValue('1.000.000')
    await expect(savedRow.locator('input[type=date]')).toHaveValue('2026-06-29')
  })

  test('xem rồi bỏ ghi NVK từ danh sách', async ({ page }) => {
    await page.goto('/general?tab=other-voucher')
    const row = page.locator('tbody tr').first()
    // Cột: [checkbox, ngày hạch toán, ngày chứng từ, số chứng từ, …]
    const voucherNo = (await row.locator('td').nth(3).innerText()).split('\n')[0].trim()

    await rowMenuAction(page, voucherNo, 'Bỏ ghi')
    await expect(page.locator('tbody tr', { hasText: voucherNo })).toContainText('Chưa ghi sổ')
    await rowMenuAction(page, voucherNo, 'Ghi sổ')
    await expect(page.locator('tbody tr', { hasText: voucherNo })).not.toContainText('Chưa ghi sổ')
  })
})
