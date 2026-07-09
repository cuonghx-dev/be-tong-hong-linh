import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { TabPlaceholder } from '@/shared/ui/tab-placeholder'
import { PurchaseTable } from '../components/PurchaseTable'
import { SupplierTable } from '../components/SupplierTable'

const TABS: ModuleTab[] = [
  { key: 'process', label: 'Quy trình', render: () => <TabPlaceholder label="Quy trình" /> },
  { key: 'purchase', label: 'Mua hàng hóa', render: () => <PurchaseTable /> },
  { key: 'debt', label: 'Công nợ', render: () => <TabPlaceholder label="Công nợ" /> },
  { key: 'supplier', label: 'Nhà cung cấp', render: () => <SupplierTable /> },
  { key: 'report', label: 'Báo cáo', render: () => <TabPlaceholder label="Báo cáo" /> },
]

export function PurchasePage() {
  return <ModuleContent tabs={TABS} defaultTab="purchase" />
}
