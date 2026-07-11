import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { TabPlaceholder } from '@/shared/ui/tab-placeholder'
import { CustomerTable } from '../components/CustomerTable'
import { ReceivableTable } from '../components/ReceivableTable'
import { SalesProcessTab } from '../components/SalesProcessTab'
import { SalesVoucherTable } from '../components/SalesVoucherTable'

const TABS: ModuleTab[] = [
  { key: 'process', label: 'Quy trình', render: () => <SalesProcessTab /> },
  { key: 'sale', label: 'Bán hàng', render: () => <SalesVoucherTable /> },
  { key: 'debt', label: 'Công nợ', render: () => <ReceivableTable /> },
  { key: 'customer', label: 'Khách hàng', render: () => <CustomerTable /> },
  { key: 'report', label: 'Báo cáo', render: () => <TabPlaceholder label="Báo cáo" /> },
]

export function SalesPage() {
  return <ModuleContent tabs={TABS} defaultTab="sale" />
}
