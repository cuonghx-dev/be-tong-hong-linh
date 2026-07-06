import { ModuleContent, type ModuleTab } from '@/layouts/ModuleContent'
import { formatCurrency } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import {
  ChevronDownIcon,
  ExcelIcon,
  FilterIcon,
  RefreshIcon,
  SearchIcon,
  SettingsIcon,
} from '@/shared/ui/icons'

interface Row {
  date: string
  code: string
  desc: string
  amount: number
  partner: string
}

const ROWS: Row[] = [
  { date: '02/07/2026', code: 'BC00088', desc: 'Thu tiền chuyển khoản KH ABC', amount: 120_000_000, partner: 'CTY ABC' },
  { date: '02/07/2026', code: 'BN00061', desc: 'Chi trả nhà cung cấp XYZ', amount: -55_000_000, partner: 'CTY XYZ' },
  { date: '01/07/2026', code: 'BC00087', desc: 'Lãi tiền gửi ngân hàng', amount: 2_150_000, partner: 'Vietcombank' },
  { date: '30/06/2026', code: 'BN00060', desc: 'Phí dịch vụ ngân hàng', amount: -330_000, partner: 'Vietcombank' },
]

const total = ROWS.reduce((s, r) => s + r.amount, 0)

function BankTable() {
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <Button variant="outline" size="sm" disabled>
          Thực hiện hàng loạt <ChevronDownIcon size={14} />
        </Button>
        <Button variant="outline" size="sm">
          <FilterIcon size={16} /> Lọc
        </Button>
        <Button variant="ghost" size="sm">
          Tất cả <ChevronDownIcon size={14} />
        </Button>
        <span className="text-sm text-slate-400">Đầu năm tới hiện tại</span>

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm">
            Thu tiền <ChevronDownIcon size={14} />
          </Button>
          <Button size="sm" variant="secondary">
            Chi tiền <ChevronDownIcon size={14} />
          </Button>
          <div className="relative">
            <SearchIcon size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Tìm kiếm"
              className="h-8 w-44 rounded-md border border-border pl-8 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100">
            <RefreshIcon size={16} />
          </button>
          <button className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100">
            <ExcelIcon size={16} />
          </button>
          <button className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100">
            <SettingsIcon size={16} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-10 px-3 py-2 text-center">
                <input type="checkbox" />
              </th>
              <th className="px-3 py-2">Ngày hạch toán</th>
              <th className="px-3 py-2">Số chứng từ</th>
              <th className="px-3 py-2">Diễn giải</th>
              <th className="px-3 py-2 text-right">Số tiền</th>
              <th className="px-3 py-2">Đối tượng</th>
              <th className="px-3 py-2">Chức năng</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.code} className="border-t border-border hover:bg-slate-50">
                <td className="px-3 py-2 text-center">
                  <input type="checkbox" />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.date}</td>
                <td className="px-3 py-2">
                  <a href="#" className="text-primary hover:underline">
                    {r.code}
                  </a>
                </td>
                <td className="px-3 py-2 text-slate-700">{r.desc}</td>
                <td
                  className={
                    'whitespace-nowrap px-3 py-2 text-right tabular-nums ' +
                    (r.amount < 0 ? 'text-red-600' : 'text-emerald-600')
                  }
                >
                  {formatCurrency(r.amount)}
                </td>
                <td className="max-w-[160px] truncate px-3 py-2 text-slate-600">{r.partner}</td>
                <td className="px-3 py-2">
                  <a href="#" className="text-primary hover:underline">
                    Xem
                  </a>
                  <span className="text-slate-300"> ▾</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-slate-100 font-medium">
            <tr className="border-t border-border">
              <td className="px-3 py-2" colSpan={4}>
                Tổng
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(total)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center border-t border-border px-3 py-2 text-sm text-slate-500">
        <span>
          Tổng số: <b className="text-slate-700">{ROWS.length}</b> bản ghi
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span>20 bản ghi trên 1 trang</span>
          <div className="flex items-center gap-1">
            <button className="rounded px-2 py-1 hover:bg-slate-100">Trước</button>
            <button className="rounded bg-primary px-2.5 py-1 text-white">1</button>
            <button className="rounded px-2 py-1 hover:bg-slate-100">2</button>
            <button className="rounded px-2 py-1 hover:bg-slate-100">Sau</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const TABS: ModuleTab[] = [
  { key: 'txn', label: 'Thu, chi tiền', render: () => <BankTable /> },
]

export function BankPage() {
  return <ModuleContent tabs={TABS} defaultTab="txn" />
}
