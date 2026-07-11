import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { TabPlaceholder } from '@/shared/ui/tab-placeholder'
import { GoodsIssueTable } from '../components/GoodsIssueTable'
import { InventoryProcessTab } from '../components/InventoryProcessTab'
import { ReceiptTable } from '../components/ReceiptTable'

const TABS: ModuleTab[] = [
  { key: 'process', label: 'Quy trình', render: () => <InventoryProcessTab /> },
  { key: 'in', label: 'Nhập kho', render: () => <ReceiptTable /> },
  { key: 'out', label: 'Xuất kho', render: () => <GoodsIssueTable /> },
  { key: 'report', label: 'Báo cáo', render: () => <TabPlaceholder label="Báo cáo" /> },
]

export function InventoryPage() {
  return <ModuleContent tabs={TABS} />
}
