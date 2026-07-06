import { createBrowserRouter, RouterProvider } from 'react-router-dom'

// TODO: lazy load page theo feature, ví dụ:
// const InvoiceListPage = lazy(() => import('@/features/sales/pages/InvoiceListPage'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <div style={{ padding: 24 }}>Kế toán SME — scaffold OK. Thêm route theo feature.</div>,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
