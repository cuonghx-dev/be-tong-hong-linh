import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { TabPlaceholder } from '@/shared/ui/tab-placeholder'
import { CustomerTable } from '../components/CustomerTable'
import { ReceivableTable } from '../components/ReceivableTable'
import { SalesVoucherTable } from '../components/SalesVoucherTable'

const TABS: ModuleTab[] = [
  { key: 'sale', label: 'Bán hàng', render: () => <SalesVoucherTable /> },
  { key: 'debt', label: 'Công nợ', render: () => <ReceivableTable /> },
  { key: 'report', label: 'Báo cáo', render: () => <TabPlaceholder label="Báo cáo" /> },
  { key: 'process', label: 'Quy trình', render: () => <TabPlaceholder label="Quy trình" /> },
  { key: 'customer', label: 'Khách hàng', render: () => <CustomerTable /> },
]

export function SalesPage() {
  return <ModuleContent tabs={TABS} defaultTab="sale" />
}
