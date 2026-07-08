import { ItemTable } from '@/features/purchase'
import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { GoodsIssueTable } from '../components/GoodsIssueTable'
import { ReceiptTable } from '../components/ReceiptTable'

function Placeholder({ title }: { title: string }) {
  return (
    <div className="grid h-full place-items-center rounded-lg border border-dashed border-border text-slate-400">
      Tab “{title}” — chưa triển khai
    </div>
  )
}

const TABS: ModuleTab[] = [
  { key: 'in', label: 'Nhập kho', render: () => <ReceiptTable /> },
  { key: 'out', label: 'Xuất kho', render: () => <GoodsIssueTable /> },
  { key: 'production', label: 'Lệnh sản xuất', render: () => <Placeholder title="Lệnh sản xuất" /> },
  // HHDV — master dùng chung, tái dùng ItemTable của phân hệ Mua hàng.
  { key: 'item', label: 'Hàng hóa dịch vụ', render: () => <ItemTable /> },
]

export function InventoryPage() {
  return <ModuleContent tabs={TABS} defaultTab="in" />
}
