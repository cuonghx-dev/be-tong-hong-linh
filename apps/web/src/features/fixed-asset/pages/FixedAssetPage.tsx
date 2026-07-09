import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { AssetIncreaseTable } from '../components/AssetIncreaseTable'
import { DisposalTable } from '../components/DisposalTable'
import { FixedAssetTable } from '../components/FixedAssetTable'

function Placeholder({ title }: { title: string }) {
  return (
    <div className="grid h-full place-items-center rounded-lg border border-dashed border-border text-slate-400">
      Tab “{title}” — chưa triển khai
    </div>
  )
}

const TABS: ModuleTab[] = [
  { key: 'ledger', label: 'Sổ tài sản', render: () => <FixedAssetTable /> },
  { key: 'increase', label: 'Ghi tăng', render: () => <AssetIncreaseTable /> },
  { key: 'depreciation', label: 'Tính khấu hao', render: () => <Placeholder title="Tính khấu hao" /> },
  { key: 'decrease', label: 'Ghi giảm', render: () => <DisposalTable /> },
]

export function FixedAssetPage() {
  return <ModuleContent tabs={TABS} defaultTab="ledger" />
}
