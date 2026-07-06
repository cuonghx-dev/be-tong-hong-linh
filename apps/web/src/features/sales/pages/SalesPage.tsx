import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { CustomerTable } from '../components/CustomerTable'
import { InvoiceTable } from '../components/InvoiceTable'
import { ReceivableTable } from '../components/ReceivableTable'
import { SalesVoucherTable } from '../components/SalesVoucherTable'

function Placeholder({ title }: { title: string }) {
  return (
    <div className="grid h-full place-items-center rounded-lg border border-dashed border-border text-slate-400">
      Tab “{title}” — chưa triển khai
    </div>
  )
}

const TABS: ModuleTab[] = [
  { key: 'chart', label: 'Biểu đồ', render: () => <Placeholder title="Biểu đồ" /> },
  { key: 'sale', label: 'Bán hàng', render: () => <SalesVoucherTable /> },
  { key: 'invoice', label: 'Hóa đơn', render: () => <InvoiceTable /> },
  { key: 'debt', label: 'Công nợ', render: () => <ReceivableTable /> },
  { key: 'collect', label: 'Thu nợ', render: () => <Placeholder title="Thu nợ" /> },
  { key: 'customer', label: 'Khách hàng', render: () => <CustomerTable /> },
  { key: 'item', label: 'Hàng hóa - dịch vụ', render: () => <Placeholder title="Hàng hóa - dịch vụ" /> },
]

export function SalesPage() {
  return <ModuleContent tabs={TABS} defaultTab="sale" />
}
