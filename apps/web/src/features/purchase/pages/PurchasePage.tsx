import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { PayableTable } from '../components/PayableTable'
import { PurchaseProcessTab } from '../components/PurchaseProcessTab'
import { PurchaseTable } from '../components/PurchaseTable'
import { PurchaseReportListTab } from '../components/reports/PurchaseReportListTab'
import { SupplierTable } from '../components/SupplierTable'

const TABS: ModuleTab[] = [
  { key: 'process', label: 'Quy trình', render: () => <PurchaseProcessTab /> },
  { key: 'purchase', label: 'Mua hàng hóa', render: () => <PurchaseTable /> },
  { key: 'debt', label: 'Đối chiếu công nợ', render: () => <PayableTable /> },
  { key: 'supplier', label: 'Nhà cung cấp', render: () => <SupplierTable /> },
  { key: 'report', label: 'Báo cáo', render: () => <PurchaseReportListTab /> },
]

export function PurchasePage() {
  return <ModuleContent tabs={TABS} />
}
