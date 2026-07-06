import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/layouts/AppShell'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { HomePage } from '@/features/dashboard/pages/HomePage'
import { CashPage } from '@/features/cash/pages/CashPage'
import { BankPage } from '@/features/bank/pages/BankPage'
import { SalesPage } from '@/features/sales/pages/SalesPage'
import { PurchasePage } from '@/features/purchase/pages/PurchasePage'
import { InventoryPage } from '@/features/inventory/pages/InventoryPage'
import { FixedAssetPage } from '@/features/fixed-asset/pages/FixedAssetPage'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
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
      { path: 'fixed-asset', element: <FixedAssetPage /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
