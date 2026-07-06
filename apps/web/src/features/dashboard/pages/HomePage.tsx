import { formatCurrency } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import { ChevronRightIcon } from '@/shared/ui/icons'

const STATS = [
  { label: 'Tồn quỹ tiền mặt', value: 151_933_876_437 },
  { label: 'Số dư ngân hàng', value: 892_120_000 },
  { label: 'Công nợ phải thu', value: 2_340_500_000 },
  { label: 'Công nợ phải trả', value: 1_120_900_000 },
]

const REPORTS = [
  'Sổ quỹ tiền mặt',
  'Bảng cân đối tài khoản',
  'Báo cáo kết quả kinh doanh',
  'Tổng hợp công nợ phải thu',
]

export function HomePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-white p-4">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-slate-800">
              {formatCurrency(s.value)}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Nghiệp vụ */}
        <div className="rounded-lg border border-border bg-white p-4 lg:col-span-2">
          <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Nghiệp vụ tiền mặt
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            {['Thu tiền', 'Kiểm kê quỹ', 'Chi tiền', 'Quyết toán tạm ứng'].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span className="rounded-md border border-border bg-slate-50 px-3 py-2">{step}</span>
                {i < 3 && <ChevronRightIcon size={16} className="text-slate-300" />}
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {['Khách hàng', 'Nhà cung cấp', 'Nhân viên', 'Tùy chọn'].map((s) => (
              <button
                key={s}
                className="rounded-md border border-border py-3 text-sm text-slate-600 hover:bg-slate-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Báo cáo */}
        <div className="rounded-lg border border-border bg-white p-4">
          <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Báo cáo
          </div>
          <ul className="space-y-1 text-sm">
            {REPORTS.map((r) => (
              <li key={r}>
                <a href="#" className="block rounded px-2 py-1.5 text-slate-600 hover:bg-slate-50">
                  {r}
                </a>
              </li>
            ))}
          </ul>
          <a href="#" className="mt-2 inline-block px-2 text-sm text-primary hover:underline">
            Tất cả báo cáo →
          </a>
        </div>
      </div>

      {/* Banner */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-gradient-to-r from-primary/5 to-transparent p-4">
        <div className="flex-1">
          <div className="font-semibold text-slate-800">Kế toán SME — Quy trình tự động</div>
          <div className="text-sm text-slate-500">
            Số hóa toàn bộ quy trình thu chi, phê duyệt và hạch toán.
          </div>
        </div>
        <Button variant="outline" size="sm">
          Xem tính năng
        </Button>
        <Button size="sm">Kết nối ngay</Button>
      </div>
    </div>
  )
}
