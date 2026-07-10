import { CashVoucherType } from '@app/shared'
import { Link, useNavigate } from 'react-router-dom'

// Tab "Quy trình" phân hệ Tiền mặt — bố cục dashboard 2 cột + banner (§2.3 design.md).

const REPORTS = [
  'Bảng kê số dư tiền theo ngày',
  'Dòng tiền',
  'S03a1-DNN: Sổ nhật ký thu tiền',
  'Sổ kế toán chi tiết quỹ tiền mặt',
  'S03a2-DNN: Sổ nhật ký chi tiền',
]

const SHORTCUTS = [
  { label: 'Khách hàng', to: '/catalog/khach-hang', icon: <PersonIcon /> },
  { label: 'Nhà cung cấp', to: '/catalog/nha-cung-cap', icon: <PersonBoxIcon /> },
  { label: 'Nhân viên', to: '/catalog/nhan-vien', icon: <PeopleIcon /> },
  { label: 'Tùy chọn', to: null, icon: <GearIcon /> },
]

export function CashProcessTab() {
  const navigate = useNavigate()
  const openNew = (type: CashVoucherType) => navigate(`/cash/vouchers/new?type=${type}`)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
        {/* Cột trái: sơ đồ nghiệp vụ + hàng shortcut */}
        <div className="flex flex-col gap-3">
          <section className="rounded-lg border border-border bg-white">
            <h2 className="border-b border-border py-3 text-center text-sm font-bold uppercase tracking-wide text-slate-700">
              Nghiệp vụ tiền mặt
            </h2>

            {/* Sơ đồ flow: Thu tiền / Chi tiền → Kiểm kê quỹ → … */}
            <div className="flex items-center justify-center gap-0 px-6 py-14">
              <div className="flex flex-col gap-20">
                <FlowNode
                  label="Thu tiền"
                  icon={<ReceiptStackIcon kind="thu" />}
                  onClick={() => openNew(CashVoucherType.Receipt)}
                />
                <FlowNode
                  label="Chi tiền"
                  icon={<ReceiptStackIcon kind="chi" />}
                  onClick={() => openNew(CashVoucherType.Payment)}
                />
              </div>

              {/* Nhánh gộp: vạch dọc nối 2 node trái + mũi tên sang Kiểm kê quỹ */}
              <svg
                width="220"
                height="220"
                viewBox="0 0 220 220"
                className="shrink-0 text-emerald-600/40"
                aria-hidden
              >
                <line x1="10" y1="30" x2="10" y2="190" stroke="currentColor" strokeWidth="1.5" />
                <line x1="10" y1="110" x2="200" y2="110" stroke="currentColor" strokeWidth="1.5" />
                <path d="M200 105 L212 110 L200 115 Z" fill="currentColor" />
              </svg>

              <FlowNode label="Kiểm kê quỹ" icon={<ChecklistIcon />} disabled />

              <svg
                width="150"
                height="12"
                viewBox="0 0 150 12"
                className="shrink-0 text-emerald-600/40"
                aria-hidden
              >
                <line x1="0" y1="6" x2="136" y2="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M136 1 L148 6 L136 11 Z" fill="currentColor" />
              </svg>
            </div>
          </section>

          {/* Hàng shortcut danh mục */}
          <section className="grid grid-cols-2 rounded-lg border border-border bg-white sm:grid-cols-4">
            {SHORTCUTS.map((s, i) =>
              s.to ? (
                <Link
                  key={s.label}
                  to={s.to}
                  className={shortcutClass(i)}
                >
                  <span className="text-primary">{s.icon}</span>
                  <span>{s.label}</span>
                </Link>
              ) : (
                <button
                  key={s.label}
                  type="button"
                  title="Tính năng đang phát triển."
                  className={shortcutClass(i)}
                >
                  <span className="text-primary">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ),
            )}
          </section>
        </div>

        {/* Cột phải: panel báo cáo */}
        <section className="flex flex-col rounded-lg border border-border bg-white">
          <h2 className="border-b border-border py-3 text-center text-sm font-bold uppercase tracking-wide text-slate-700">
            Báo cáo
          </h2>
          <ul className="flex-1 px-4">
            {REPORTS.map((r) => (
              <li key={r} className="border-b border-border/70 last:border-b-0">
                <button
                  type="button"
                  title="Tính năng đang phát triển."
                  className="flex w-full items-center gap-3 py-4 text-left text-sm text-slate-700 hover:text-primary"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  {r}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            title="Tính năng đang phát triển."
            className="border-t border-border py-3 text-center text-sm font-medium text-primary hover:underline"
          >
            Tất cả báo cáo
          </button>
        </section>
      </div>

      {/* Banner tính năng */}
      <section className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-white p-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500 text-lg font-bold text-white">
          Q
        </span>
        <span className="text-sm font-bold text-slate-800">AMIS Quy trình</span>
        <span className="text-sm text-slate-600">
          Phê duyệt và <b>tự động hóa</b> quy trình chi tiền, tạm ứng
        </span>
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            title="Tính năng đang phát triển."
            className="flex items-center gap-1 text-sm text-sky-600 hover:underline"
          >
            <BulbIcon />
            Xem tính năng
          </button>
          <button
            type="button"
            title="Tính năng đang phát triển."
            className="rounded-md border border-sky-500 px-4 py-1.5 text-sm font-medium text-sky-600 hover:bg-sky-50"
          >
            Kết nối ngay
          </button>
        </div>
      </section>
    </div>
  )
}

function shortcutClass(i: number) {
  return [
    'flex items-center justify-center gap-2 py-4 text-sm text-slate-700 hover:bg-slate-50',
    i > 0 ? 'border-l border-border' : '',
  ].join(' ')
}

// Node trong sơ đồ flow: icon + label, click điều hướng (nếu có).
function FlowNode({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string
  icon: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={disabled ? 'Tính năng đang phát triển.' : undefined}
      className="group flex w-24 flex-col items-center gap-2"
    >
      <span className="transition-transform group-hover:scale-105">{icon}</span>
      <span className="text-sm text-slate-700 group-hover:text-primary">{label}</span>
    </button>
  )
}

/* ---- Icon riêng của sơ đồ (theo phong cách MISA, không dùng chỗ khác) ---- */

// Phiếu thu/chi: tờ phiếu + badge THU/CHI + tờ tiền.
function ReceiptStackIcon({ kind }: { kind: 'thu' | 'chi' }) {
  const money = kind === 'thu' ? '#8bc34a' : '#fbc02d'
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="8" y="6" width="28" height="26" rx="3" fill="#43a047" />
      <rect x="8" y="6" width="16" height="9" rx="2" fill="#2e7d32" />
      <text x="16" y="13" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#fff">
        {kind === 'thu' ? 'THU' : 'CHI'}
      </text>
      <rect x="12" y="22" width="24" height="14" rx="2" fill={money} stroke="#fff" strokeWidth="1.5" />
      <circle cx="24" cy="29" r="4" fill="#fff" opacity="0.85" />
    </svg>
  )
}

// Kiểm kê quỹ: bảng checklist + máy tính nhỏ.
function ChecklistIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="8" y="5" width="26" height="32" rx="3" fill="#43a047" />
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M13 13 l2.5 2.5 L20 11" />
        <line x1="23" y1="13" x2="29" y2="13" />
        <path d="M13 21 l2.5 2.5 L20 19" />
        <line x1="23" y1="21" x2="29" y2="21" />
      </g>
      <rect x="26" y="26" width="13" height="13" rx="2" fill="#8bc34a" stroke="#fff" strokeWidth="1.5" />
      <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
        <line x1="29.5" y1="32.5" x2="35.5" y2="32.5" />
        <line x1="32.5" y1="29.5" x2="32.5" y2="35.5" />
      </g>
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  )
}

function PersonBoxIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3 20c0-3.5 3-6 7-6" />
      <rect x="14" y="13" width="7" height="7" rx="1" />
      <path d="M16 16.5h3" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 2.8-6 6.5-6s6.5 2.5 6.5 6" />
      <path d="M16 5a3.5 3.5 0 0 1 0 6.5M18.5 14.5c2 .8 3 2.6 3 5" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
    </svg>
  )
}

function BulbIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3Z" />
    </svg>
  )
}
