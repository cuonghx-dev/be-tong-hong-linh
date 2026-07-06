import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'

function Placeholder({ title }: { title: string }) {
  return (
    <div className="grid h-full place-items-center rounded-lg border border-dashed border-border text-slate-400">
      Tab “{title}” — chưa triển khai
    </div>
  )
}

const TABS: ModuleTab[] = [
  { key: 'chart', label: 'Biểu đồ', render: () => <Placeholder title="Biểu đồ" /> },
  { key: 'purchase', label: 'Mua hàng', render: () => <Placeholder title="Mua hàng" /> },
  { key: 'item', label: 'Hàng hóa - dịch vụ', render: () => <Placeholder title="Hàng hóa - dịch vụ" /> },
  { key: 'supplier', label: 'Nhà cung cấp', render: () => <Placeholder title="Nhà cung cấp" /> },
]

export function PurchasePage() {
  return <ModuleContent tabs={TABS} />
}
