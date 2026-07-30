import { test, expect, type Page } from '@playwright/test'
import { fillAccount, fillWarehouse } from '../helpers/account'
import { fieldInput } from '../helpers/form'
import { fillFirstItemLine, rowMenuAction } from '../helpers/voucher'

// Phân hệ Kho: phiếu nhập kho (NK) + phiếu xuất kho (XK) lập tay, form full-page (§5 design.md).
// Loại phiếu nhập lập tay duy nhất = "Nhập kho thành phẩm sản xuất" (155/154);
// loại "mua hàng trong nước" do chứng từ mua hàng tự sinh (đã phủ ở purchase.spec.ts).

const firstRow = (page: Page) => page.locator('table tbody tr').first()
// Dòng hàng phiếu nhập/xuất: [mã hàng, tên hàng, kho, TK Nợ, TK Có, ĐVT, SL, đơn giá].
const debitCell = (page: Page) => firstRow(page).locator('input').nth(3)
const creditCell = (page: Page) => firstRow(page).locator('input').nth(4)
const qtyCell = (page: Page) => firstRow(page).locator('input[type=number]').first()

test.describe('Kho — phiếu nhập kho', () => {
  test('tạo phiếu nhập kho thành phẩm sản xuất (NK)', async ({ page }) => {
    await page.goto('/inventory/receipts/new')
    await expect(page.getByRole('heading', { name: /Phiếu nhập kho/ })).toBeVisible()

    // Loại lập tay mặc định → cụm đối tượng là người giao hàng, không có ô Người giao hàng riêng.
    await expect(page.locator('label').filter({ hasText: /^Mã người giao hàng$/ })).toBeVisible()
    await expect(page.locator('label').filter({ hasText: /^Người giao hàng$/ })).toHaveCount(0)
    // Định khoản mặc định thành phẩm SX: Nợ 155 / Có 154 (đồng bộ receipt.service).
    await expect(debitCell(page)).toHaveValue('155')
    await expect(creditCell(page)).toHaveValue('154')

    const noInput = fieldInput(page, 'Số chứng từ')
    await expect(noInput).toHaveValue(/^NK/)
    const voucherNo = await noInput.inputValue()

    await fieldInput(page, 'Diễn giải').fill('Nhập kho thành phẩm E2E')
    await fillFirstItemLine(page, 'BINHDAU', '250000')
    await fillWarehouse(firstRow(page))
    await qtyCell(page).fill('3')

    await page.getByRole('button', { name: 'Cất', exact: true }).click()
    await expect(page).toHaveURL(/\/inventory(?!\/receipts)/)

    await page.goto('/inventory?tab=in')
    const row = page.locator('tbody tr', { hasText: voucherNo })
    await expect(row).toContainText('Nhập kho thành phẩm E2E')
    await expect(row).toContainText('Nhập kho thành phẩm sản xuất')
    // 3 × 250.000 = 750.000
    await expect(row).toContainText('750.000')
  })

  test('bỏ ghi rồi ghi sổ lại phiếu nhập từ danh sách', async ({ page }) => {
    await page.goto('/inventory?tab=in')
    const row = page.locator('tbody tr').first()
    const voucherNo = (await row.locator('td').nth(2).innerText()).split('\n')[0].trim()

    await rowMenuAction(page, voucherNo, 'Bỏ ghi')
    await expect(page.locator('tbody tr', { hasText: voucherNo })).toContainText('Chưa ghi sổ')

    await rowMenuAction(page, voucherNo, 'Ghi sổ')
    await expect(page.locator('tbody tr', { hasText: voucherNo })).not.toContainText('Chưa ghi sổ')
  })

  test('không cất được phiếu thiếu tên hàng', async ({ page }) => {
    await page.goto('/inventory/receipts/new')
    await expect(page.getByRole('heading', { name: /Phiếu nhập kho/ })).toBeVisible()
    // Dòng mặc định SL 1 nhưng chưa có tên hàng → zod chặn, vẫn ở lại form.
    await page.getByRole('button', { name: 'Cất', exact: true }).click()
    await expect(page).toHaveURL(/\/inventory\/receipts\/new/)
  })
})

test.describe('Kho — phiếu xuất kho', () => {
  test('tạo phiếu xuất kho bán hàng (XK)', async ({ page }) => {
    await page.goto('/inventory/issues/new')
    await expect(page.getByRole('heading', { name: /Phiếu xuất kho/ })).toBeVisible()
    // Lý do xuất mặc định = bán hàng → cụm khách hàng.
    await expect(page.locator('label').filter({ hasText: /^Mã khách hàng$/ })).toBeVisible()

    const noInput = fieldInput(page, 'Số chứng từ')
    await expect(noInput).toHaveValue(/^XK/)
    const voucherNo = await noInput.inputValue()

    await fieldInput(page, 'Tên khách hàng').fill('KH xuất kho E2E')
    await fieldInput(page, 'Lý do xuất').fill('Xuất kho bán hàng E2E')
    await fillFirstItemLine(page, 'BINHDAU', '300000')
    await fillWarehouse(firstRow(page))
    await qtyCell(page).fill('2')
    // Xuất bán: giá vốn ghi Nợ 632 / Có TK kho — TK Nợ tự nhập nếu form để trống.
    if (!(await debitCell(page).inputValue())) await fillAccount(page, debitCell(page), '632')

    await page.getByRole('button', { name: 'Cất', exact: true }).click()
    await expect(page).toHaveURL(/\/inventory(?!\/issues)/)

    await page.goto('/inventory?tab=out')
    const row = page.locator('tbody tr', { hasText: voucherNo })
    await expect(row).toContainText('Xuất kho bán hàng E2E')
    await expect(row).toContainText('600.000')
  })

  test('lý do xuất sản xuất: đổi cụm đối tượng sang người nhận + bộ phận', async ({ page }) => {
    await page.goto('/inventory/issues/new')
    await expect(page.getByRole('heading', { name: /Phiếu xuất kho/ })).toBeVisible()

    await page.locator('button[title="Lý do xuất"]').click()
    await page.getByRole('option', { name: 'Xuất kho cho sản xuất', exact: true }).click()

    await expect(page.locator('label').filter({ hasText: /^Mã người nhận$/ })).toBeVisible()
    await expect(page.locator('label').filter({ hasText: /^Bộ phận$/ })).toBeVisible()
    await expect(page.locator('label').filter({ hasText: /^Mã khách hàng$/ })).toHaveCount(0)
    // Cột riêng của lý do xuất sản xuất.
    await expect(page.getByRole('columnheader', { name: /Thành phẩm/ })).toBeVisible()
  })
})

test.describe('Kho — danh sách & báo cáo', () => {
  test('tab Nhập kho / Xuất kho hiển thị bảng chứng từ', async ({ page }) => {
    await page.goto('/inventory?tab=in')
    await expect(page.getByRole('columnheader', { name: /Loại chứng từ/ })).toBeVisible()

    await page.goto('/inventory?tab=out')
    await expect(page.getByRole('columnheader', { name: /Người nhận/ })).toBeVisible()
  })

  test('mở báo cáo tổng hợp tồn kho', async ({ page }) => {
    await page.goto('/inventory?tab=report')
    await expect(page.getByPlaceholder('Tìm theo tên báo cáo')).toBeVisible()
    await page.getByText('Tổng hợp tồn kho', { exact: true }).click()
    await expect(page).toHaveURL(/\/inventory\/reports\/stock-summary/)
    await expect(page.getByText('Từ ngày')).toBeVisible()
    await expect(page.getByText('Đến ngày')).toBeVisible()
  })
})
