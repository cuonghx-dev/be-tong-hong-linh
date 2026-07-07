import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { ItemTable } from '../components/ItemTable'
import { PurchaseTable } from '../components/PurchaseTable'
import { SupplierTable } from '../components/SupplierTable'

function Placeholder({ title }: { title: string }) {
  return (
    <div className="grid h-full place-items-center rounded-lg border border-dashed border-border text-slate-400">
      Tab “{title}” — chưa triển khai
    </div>
  )
}

const TABS: ModuleTab[] = [
  { key: 'chart', label: 'Biểu đồ', render: () => <Placeholder title="Biểu đồ" /> },
  { key: 'purchase', label: 'Mua hàng', render: () => <PurchaseTable /> },
  { key: 'item', label: 'Hàng hóa - dịch vụ', render: () => <ItemTable /> },
  { key: 'supplier', label: 'Nhà cung cấp', render: () => <SupplierTable /> },
]

export function PurchasePage() {
  return <ModuleContent tabs={TABS} defaultTab="purchase" />
}
