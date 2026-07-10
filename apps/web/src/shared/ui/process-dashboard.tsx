import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Dashboard tab "Quy trình" dùng chung cho các phân hệ (§2.3 design.md):
// panel sơ đồ nghiệp vụ (trái) + hàng shortcut danh mục + panel báo cáo (phải).

export interface ProcessFlowNode {
  label: string
  icon: ReactNode
  onClick?: () => void
  /** Node chưa build → inert + tooltip "đang phát triển". */
  disabled?: boolean
}

export interface ProcessShortcut {
  label: string
  icon: ReactNode
  /** Route đích; bỏ trống → nút inert. */
  to?: string
}

export function ProcessDashboard({
  title,
  sources,
  center,
  shortcuts,
  reports,
}: {
  title: string
  /** Các node nguồn bên trái (Thu tiền, Chi tiền…), gộp nhánh về node giữa. */
  sources: ProcessFlowNode[]
  /** Node giữa của sơ đồ (Kiểm kê quỹ, Đối chiếu ngân hàng…). */
  center: ProcessFlowNode
  shortcuts: ProcessShortcut[]
  reports: string[]
}) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
      {/* Cột trái: sơ đồ nghiệp vụ + hàng shortcut */}
      <div className="flex flex-col gap-3">
        <section className="rounded-lg border border-border bg-white">
          <h2 className="border-b border-border py-3 text-center text-sm font-bold uppercase tracking-wide text-slate-700">
            {title}
          </h2>

          <div className="flex items-center justify-center gap-0 px-6 py-14">
            <div className="flex flex-col gap-20">
              {sources.map((s) => (
                <FlowNode key={s.label} {...s} />
              ))}
            </div>

            {/* Nhánh gộp: vạch dọc nối các node nguồn + mũi tên sang node giữa */}
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

            <FlowNode {...center} />

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
        <section className="flex flex-wrap rounded-lg border border-border bg-white">
          {shortcuts.map((s, i) => {
            const cls = [
              'flex flex-1 basis-32 items-center justify-center gap-2 py-4 text-sm text-slate-700 hover:bg-slate-50',
              i > 0 ? 'border-l border-border' : '',
            ].join(' ')
            return s.to ? (
              <Link key={s.label} to={s.to} className={cls}>
                <span className="text-primary">{s.icon}</span>
                <span>{s.label}</span>
              </Link>
            ) : (
              <button key={s.label} type="button" title="Tính năng đang phát triển." className={cls}>
                <span className="text-primary">{s.icon}</span>
                <span>{s.label}</span>
              </button>
            )
          })}
        </section>
      </div>

      {/* Cột phải: panel báo cáo */}
      <section className="flex flex-col rounded-lg border border-border bg-white">
        <h2 className="border-b border-border py-3 text-center text-sm font-bold uppercase tracking-wide text-slate-700">
          Báo cáo
        </h2>
        <ul className="flex-1 px-4">
          {reports.map((r) => (
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
  )
}

// Node trong sơ đồ flow: icon + label, click điều hướng (nếu có).
function FlowNode({ label, icon, onClick, disabled }: ProcessFlowNode) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={disabled ? 'Tính năng đang phát triển.' : undefined}
      className="group flex w-28 flex-col items-center gap-2"
    >
      <span className="transition-transform group-hover:scale-105">{icon}</span>
      <span className="text-sm text-slate-700 group-hover:text-primary">{label}</span>
    </button>
  )
}

/* ---- Icon sơ đồ quy trình (phong cách MISA) ---- */

// Phiếu thu/chi: tờ phiếu + badge THU/CHI + motif tiền mặt (tờ tiền) hoặc ngân hàng (tòa nhà).
export function ProcessReceiptIcon({ kind, motif }: { kind: 'thu' | 'chi'; motif: 'cash' | 'bank' }) {
  const money = kind === 'thu' ? '#8bc34a' : '#fbc02d'
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="8" y="6" width="28" height="26" rx="3" fill="#43a047" />
      <rect x="8" y="6" width="16" height="9" rx="2" fill="#2e7d32" />
      <text x="16" y="13" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#fff">
        {kind === 'thu' ? 'THU' : 'CHI'}
      </text>
      {motif === 'cash' ? (
        <>
          <rect x="12" y="22" width="24" height="14" rx="2" fill={money} stroke="#fff" strokeWidth="1.5" />
          <circle cx="24" cy="29" r="4" fill="#fff" opacity="0.85" />
        </>
      ) : (
        <g>
          <rect x="20" y="24" width="18" height="14" rx="1.5" fill={money} stroke="#fff" strokeWidth="1.5" />
          <path d="M21 28 L29 24.5 L37 28 Z" fill="#fff" opacity="0.9" />
          <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
            <line x1="24" y1="30" x2="24" y2="35" />
            <line x1="29" y1="30" x2="29" y2="35" />
            <line x1="34" y1="30" x2="34" y2="35" />
          </g>
        </g>
      )}
    </svg>
  )
}

// Kiểm kê quỹ: bảng checklist + máy tính nhỏ.
export function ProcessChecklistIcon() {
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

// Đối chiếu ngân hàng: 2 thẻ checklist chồng nhau (xanh sau, vàng trước).
export function ProcessCompareIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="7" y="4" width="20" height="28" rx="3" fill="#43a047" />
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M11 11 l2 2 L17 9" />
        <line x1="19.5" y1="11" x2="23" y2="11" />
        <path d="M11 19 l2 2 L17 17" />
        <line x1="19.5" y1="19" x2="23" y2="19" />
      </g>
      <rect x="20" y="16" width="17" height="23" rx="2.5" fill="#fbc02d" stroke="#fff" strokeWidth="1.5" />
      <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M23.5 23 l2 2 L29 21.5" />
        <line x1="31" y1="23" x2="34" y2="23" />
        <path d="M23.5 31 l2 2 L29 29.5" />
        <line x1="31" y1="31" x2="34" y2="31" />
      </g>
    </svg>
  )
}

/* ---- Icon shortcut danh mục ---- */

export function ProcessPersonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  )
}

export function ProcessPersonBoxIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3 20c0-3.5 3-6 7-6" />
      <rect x="14" y="13" width="7" height="7" rx="1" />
      <path d="M16 16.5h3" />
    </svg>
  )
}

export function ProcessPeopleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 2.8-6 6.5-6s6.5 2.5 6.5 6" />
      <path d="M16 5a3.5 3.5 0 0 1 0 6.5M18.5 14.5c2 .8 3 2.6 3 5" />
    </svg>
  )
}

export function ProcessGearIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
    </svg>
  )
}

export function ProcessCardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6 10.5h5M6 13.5h3" />
    </svg>
  )
}
