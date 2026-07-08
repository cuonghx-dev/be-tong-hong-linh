import { ItemTable } from '@/features/purchase'
import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { GoodsIssueTable } from '../components/GoodsIssueTable'
import { ProductionOrderTable } from '../components/ProductionOrderTable'
import { ReceiptTable } from '../components/ReceiptTable'

const TABS: ModuleTab[] = [
  { key: 'in', label: 'Nhập kho', render: () => <ReceiptTable /> },
  { key: 'out', label: 'Xuất kho', render: () => <GoodsIssueTable /> },
  { key: 'production', label: 'Lệnh sản xuất', render: () => <ProductionOrderTable /> },
  // HHDV — master dùng chung, tái dùng ItemTable của phân hệ Mua hàng.
  { key: 'item', label: 'Hàng hóa dịch vụ', render: () => <ItemTable /> },
]

export function InventoryPage() {
  return <ModuleContent tabs={TABS} defaultTab="in" />
}
