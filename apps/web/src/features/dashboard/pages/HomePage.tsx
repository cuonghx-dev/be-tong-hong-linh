import { useOnboardingStore } from '@/features/onboarding'
import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { Button } from '@/shared/ui/button'
import { PlayIcon } from '@/shared/ui/icons'
import { CashflowWidget } from '../components/CashflowWidget'
import { PayableAgingWidget, ReceivableAgingWidget } from '../components/DebtAgingWidget'
import { ExpenseWidget } from '../components/ExpenseWidget'
import { FinanceOverviewWidget } from '../components/FinanceOverviewWidget'
import { ProfitLossWidget } from '../components/ProfitLossWidget'
import { RevenueWidget } from '../components/RevenueWidget'
import { InventoryWidget, TopSellingWidget } from '../components/TopListWidgets'

// Tổng quan: lưới widget số liệu toàn doanh nghiệp (tham chiếu bố cục MISA AMIS).
function OverviewTab() {
  return (
    <div className="-mx-6 -my-5 min-h-full bg-[#daeeee] px-6 py-5">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-3 xl:grid-cols-4">
        <FinanceOverviewWidget className="xl:col-span-2" />
        <ReceivableAgingWidget />
        <PayableAgingWidget />

        <ProfitLossWidget className="xl:col-span-2" />
        <InventoryWidget className="xl:col-span-2" />

        <RevenueWidget className="xl:col-span-2" />
        <TopSellingWidget className="xl:col-span-2" />

        <CashflowWidget className="xl:col-span-2" />
        <ExpenseWidget className="xl:col-span-2" />
      </div>
    </div>
  )
}

const TABS: ModuleTab[] = [{ key: 'overview', label: 'Tổng quan', render: () => <OverviewTab /> }]

export function HomePage() {
  const openTutorial = useOnboardingStore((s) => s.setOpen)
  return (
    <ModuleContent
      tabs={TABS}
      defaultTab="overview"
      actions={
        <Button size="sm" className="mr-1" onClick={() => openTutorial(true)}>
          <PlayIcon size={14} fill="currentColor" />
          Bắt đầu sử dụng
        </Button>
      }
    />
  )
}
