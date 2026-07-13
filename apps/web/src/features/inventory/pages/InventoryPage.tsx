import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { GoodsIssueTable } from '../components/GoodsIssueTable'
import { InventoryProcessTab } from '../components/InventoryProcessTab'
import { ReceiptTable } from '../components/ReceiptTable'
import { InventoryReportListTab } from '../components/reports/InventoryReportListTab'

const TABS: ModuleTab[] = [
  { key: 'process', label: 'Quy trình', render: () => <InventoryProcessTab /> },
  { key: 'in', label: 'Nhập kho', render: () => <ReceiptTable /> },
  { key: 'out', label: 'Xuất kho', render: () => <GoodsIssueTable /> },
  { key: 'report', label: 'Báo cáo', render: () => <InventoryReportListTab /> },
]

export function InventoryPage() {
  return <ModuleContent tabs={TABS} />
}
