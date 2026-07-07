import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { ItemTable } from '../components/ItemTable'
import { PurchaseTable } from '../components/PurchaseTable'
import { SupplierTable } from '../components/SupplierTable'

const TABS: ModuleTab[] = [
  { key: 'purchase', label: 'Mua hàng', render: () => <PurchaseTable /> },
  { key: 'item', label: 'Hàng hóa - dịch vụ', render: () => <ItemTable /> },
  { key: 'supplier', label: 'Nhà cung cấp', render: () => <SupplierTable /> },
]

export function PurchasePage() {
  return <ModuleContent tabs={TABS} defaultTab="purchase" />
}
