import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
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
    <div className="-m-4 min-h-full bg-[#daeeee] p-4">
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
  return <ModuleContent tabs={TABS} defaultTab="overview" />
}
