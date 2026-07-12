import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/layouts/AppShell'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { HomePage } from '@/features/dashboard/pages/HomePage'
import { CashPage } from '@/features/cash/pages/CashPage'
import { CashVoucherPage } from '@/features/cash/pages/CashVoucherPage'
import { BankPage } from '@/features/bank/pages/BankPage'
import { BankVoucherPage } from '@/features/bank/pages/BankVoucherPage'
import { SalesPage } from '@/features/sales/pages/SalesPage'
import { SalesVoucherPage } from '@/features/sales/pages/SalesVoucherPage'
import { PurchasePage } from '@/features/purchase/pages/PurchasePage'
import { PurchaseVoucherPage } from '@/features/purchase/pages/PurchaseVoucherPage'
import { InventoryPage } from '@/features/inventory/pages/InventoryPage'
import { InventoryReceiptPage } from '@/features/inventory/pages/InventoryReceiptPage'
import { GoodsIssueVoucherPage } from '@/features/inventory/pages/GoodsIssueVoucherPage'
import { GeneralPage } from '@/features/general/pages/GeneralPage'
import { GeneralVoucherPage } from '@/features/general/pages/GeneralVoucherPage'
import { OpeningBalancePage } from '@/features/opening-balance/pages/OpeningBalancePage'
import { OpeningBalanceItemPage } from '@/features/opening-balance/pages/OpeningBalanceItemPage'
import { AccountBalancePage } from '@/features/opening-balance/pages/AccountBalancePage'
import { AccountBalanceEntryPage } from '@/features/opening-balance/pages/AccountBalanceEntryPage'
import { CatalogPage } from '@/features/catalog/pages/CatalogPage'
import { CatalogItemPage } from '@/features/catalog/pages/CatalogItemPage'

// Trang chứng từ full-page (§5) — standalone, đè Sidebar/Header.
const recordRoutes = [
  { path: '/cash/vouchers/new', element: <CashVoucherPage mode="new" /> },
  { path: '/cash/vouchers/:id', element: <CashVoucherPage mode="view" /> },
  { path: '/cash/vouchers/:id/edit', element: <CashVoucherPage mode="edit" /> },
  { path: '/bank/vouchers/new', element: <BankVoucherPage mode="new" /> },
  { path: '/bank/vouchers/:id', element: <BankVoucherPage mode="view" /> },
  { path: '/bank/vouchers/:id/edit', element: <BankVoucherPage mode="edit" /> },
  { path: '/purchase/vouchers/new', element: <PurchaseVoucherPage mode="new" /> },
  { path: '/purchase/vouchers/:id', element: <PurchaseVoucherPage mode="view" /> },
  { path: '/purchase/vouchers/:id/edit', element: <PurchaseVoucherPage mode="edit" /> },
  { path: '/sales/vouchers/new', element: <SalesVoucherPage mode="new" /> },
  { path: '/sales/vouchers/:id', element: <SalesVoucherPage mode="view" /> },
  { path: '/sales/vouchers/:id/edit', element: <SalesVoucherPage mode="edit" /> },
  { path: '/inventory/receipts/new', element: <InventoryReceiptPage mode="new" /> },
  { path: '/inventory/receipts/:id', element: <InventoryReceiptPage mode="view" /> },
  { path: '/inventory/receipts/:id/edit', element: <InventoryReceiptPage mode="edit" /> },
  { path: '/inventory/issues/new', element: <GoodsIssueVoucherPage mode="new" /> },
  { path: '/inventory/issues/:id', element: <GoodsIssueVoucherPage mode="view" /> },
  { path: '/inventory/issues/:id/edit', element: <GoodsIssueVoucherPage mode="edit" /> },
  { path: '/general/vouchers/new', element: <GeneralVoucherPage mode="new" /> },
  { path: '/general/vouchers/:id', element: <GeneralVoucherPage mode="view" /> },
  { path: '/general/vouchers/:id/edit', element: <GeneralVoucherPage mode="edit" /> },
  // Nhập số dư tài khoản chi tiết — full-page, đè shell (vào từ nút "Sửa").
  { path: '/opening-balance/so-du-tai-khoan/nhap', element: <AccountBalanceEntryPage /> },
].map((r) => ({
  path: r.path,
  element: <RequireAuth>{r.element}</RequireAuth>,
}))

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  ...recordRoutes,
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'cash', element: <CashPage /> },
      { path: 'bank', element: <BankPage /> },
      { path: 'purchase', element: <PurchasePage /> },
      { path: 'sales', element: <SalesPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'general', element: <GeneralPage /> },
      { path: 'opening-balance', element: <OpeningBalancePage /> },
      { path: 'opening-balance/so-du-tai-khoan', element: <AccountBalancePage /> },
      { path: 'opening-balance/:slug', element: <OpeningBalanceItemPage /> },
      { path: 'catalog', element: <CatalogPage /> },
      { path: 'catalog/:slug', element: <CatalogItemPage /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
