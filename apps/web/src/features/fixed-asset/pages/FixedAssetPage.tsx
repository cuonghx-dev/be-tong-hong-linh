import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'

function Placeholder({ title }: { title: string }) {
  return (
    <div className="grid h-full place-items-center rounded-lg border border-dashed border-border text-slate-400">
      Tab “{title}” — chưa triển khai
    </div>
  )
}

const TABS: ModuleTab[] = [
  { key: 'ledger', label: 'Sổ tài sản', render: () => <Placeholder title="Sổ tài sản" /> },
  { key: 'increase', label: 'Ghi tăng', render: () => <Placeholder title="Ghi tăng" /> },
  { key: 'depreciation', label: 'Tính khấu hao', render: () => <Placeholder title="Tính khấu hao" /> },
  { key: 'decrease', label: 'Ghi giảm', render: () => <Placeholder title="Ghi giảm" /> },
]

export function FixedAssetPage() {
  return <ModuleContent tabs={TABS} />
}
