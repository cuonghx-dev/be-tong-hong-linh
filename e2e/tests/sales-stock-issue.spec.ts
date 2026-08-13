import { test, expect } from '@playwright/test'
import { fillWarehouse } from '../helpers/account'
import { fieldInput } from '../helpers/form'
import { fillFirstItemLine } from '../helpers/voucher'
import { pickOrCreateCustomer } from '../helpers/sales'

// Bán hàng KIÊM phiếu xuất — luồng phổ biến nhất của SME thương mại: chứng từ bán
// tự sinh phiếu xuất kho (ghi giá vốn 632). Cần tồn kho > 0 → nhập kho trước.
test.describe('Bán hàng — kiêm phiếu xuất kho', () => {
  test('bán hàng kiêm phiếu xuất tự sinh phiếu XK', async ({ page }) => {
    // 1. Nhập kho 5 BINHDAU để có tồn (phiếu mới posted mặc định).
    await page.goto('/inventory/receipts/new')
    await expect(page.getByRole('heading', { name: /Phiếu nhập kho/ })).toBeVisible()
    await fieldInput(page, 'Diễn giải').fill('Nhập tồn cho bán kiêm xuất E2E')
    await fillFirstItemLine(page, 'BINHDAU', '200000')
    const receiptRow = page.locator('table tbody tr').first()
    await fillWarehouse(receiptRow)
    await receiptRow.locator('input[type=number]').first().fill('5')
    await page.getByRole('button', { name: 'Cất', exact: true }).click()
    await expect(page).toHaveURL(/\/inventory(?!\/receipts)/)

    // 2. Đếm phiếu xuất hiện có để so sau khi bán.
    await page.goto('/inventory?tab=out')
    await expect(page.getByRole('columnheader', { name: /Người nhận/ })).toBeVisible()
    const beforeText = (await page.getByText(/Tổng số:/).innerText()).match(/\d+/)?.[0] ?? '0'

    // 3. Tạo chứng từ bán KIÊM phiếu xuất; tab Giá vốn cần kho → điền trước khi Cất.
    await page.goto('/sales?tab=sale')
    await page.getByRole('button', { name: 'Thêm', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Chứng từ bán hàng', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Chứng từ bán hàng/ })).toBeVisible()
    await page.getByRole('checkbox', { name: 'Kiêm phiếu xuất' }).check()

    await pickOrCreateCustomer(page)
    const voucherNo = await fieldInput(page, 'Số chứng từ').inputValue()
    await fillFirstItemLine(page, 'BINHDAU', '500000')

    // Tab Giá vốn: kho lấy theo ngầm định VTHH, chưa có thì điền tay.
    await page.getByRole('tab', { name: 'Giá vốn' }).click()
    const costRow = page.locator('table tbody tr').first()
    const warehouseInput = costRow.getByPlaceholder('Mã kho')
    if (!(await warehouseInput.inputValue())) await fillWarehouse(costRow)
    await page.getByRole('tab', { name: 'Hàng tiền' }).click()

    await page.getByRole('button', { name: 'Cất', exact: true }).click()
    await expect(page).toHaveURL(/\/sales(?!\/vouchers)/)

    // 4. Dòng bán hàng badge "Đã xuất" + kho có thêm 1 phiếu xuất.
    await page.goto('/sales?tab=sale')
    await expect(page.locator('tbody tr', { hasText: voucherNo }).getByText('Đã xuất')).toBeVisible()

    await page.goto('/inventory?tab=out')
    await expect(page.getByText(new RegExp(`Tổng số:\\s*${Number(beforeText) + 1}`))).toBeVisible()
  })
})
