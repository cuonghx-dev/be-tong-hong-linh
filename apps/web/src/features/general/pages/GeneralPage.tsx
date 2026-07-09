import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { TabPlaceholder } from '@/shared/ui/tab-placeholder'

const TABS: ModuleTab[] = [
  { key: 'process', label: 'Quy trình', render: () => <TabPlaceholder label="Quy trình" /> },
  {
    key: 'other-voucher',
    label: 'Chứng từ nghiệp vụ khác',
    render: () => <TabPlaceholder label="Chứng từ nghiệp vụ khác" />,
  },
  { key: 'report', label: 'Báo cáo', render: () => <TabPlaceholder label="Báo cáo" /> },
]

export function GeneralPage() {
  return <ModuleContent tabs={TABS} defaultTab="process" />
}
