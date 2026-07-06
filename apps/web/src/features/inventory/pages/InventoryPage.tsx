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
  { key: 'in', label: 'Nhập kho', render: () => <Placeholder title="Nhập kho" /> },
  { key: 'out', label: 'Xuất kho', render: () => <Placeholder title="Xuất kho" /> },
  { key: 'production', label: 'Lệnh sản xuất', render: () => <Placeholder title="Lệnh sản xuất" /> },
  { key: 'item', label: 'Hàng hóa dịch vụ', render: () => <Placeholder title="Hàng hóa dịch vụ" /> },
]

export function InventoryPage() {
  return <ModuleContent tabs={TABS} />
}
