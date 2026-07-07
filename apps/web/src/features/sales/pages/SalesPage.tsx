import { ItemTable } from '@/features/purchase'
import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { CustomerTable } from '../components/CustomerTable'
import { InvoiceTable } from '../components/InvoiceTable'
import { ReceivableTable } from '../components/ReceivableTable'
import { SalesVoucherTable } from '../components/SalesVoucherTable'

const TABS: ModuleTab[] = [
  { key: 'sale', label: 'Bán hàng', render: () => <SalesVoucherTable /> },
  { key: 'invoice', label: 'Hóa đơn', render: () => <InvoiceTable /> },
  { key: 'debt', label: 'Công nợ', render: () => <ReceivableTable /> },
  { key: 'customer', label: 'Khách hàng', render: () => <CustomerTable /> },
  // HHDV — master dùng chung, tái dùng ItemTable của phân hệ Mua hàng.
  { key: 'item', label: 'Hàng hóa - dịch vụ', render: () => <ItemTable /> },
]

export function SalesPage() {
  return <ModuleContent tabs={TABS} defaultTab="sale" />
}
