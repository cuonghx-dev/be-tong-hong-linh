import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Popover } from '@/shared/ui/popover'

// Dashboard tab "Quy trình" dùng chung cho các phân hệ (§2.3 design.md):
// panel sơ đồ nghiệp vụ (trái) + hàng shortcut danh mục + panel báo cáo (phải).

export interface ProcessFlowNode {
  label: string
  icon: ReactNode
  onClick?: () => void
  /** Node chưa build → inert + tooltip "đang phát triển". */
  disabled?: boolean
  /** Có menu → click node mở dropdown các hành động (kiểu MISA) thay vì onClick. */
  menu?: { label: string; onClick: () => void }[]
}

export interface ProcessShortcut {
  label: string
  icon: ReactNode
  /** Route đích; bỏ trống → nút inert. */
  to?: string
}

/** Mục báo cáo trong panel: chuỗi (chưa có trang) hoặc `{ label, to }` (dẫn link). */
export type ProcessReport = string | { label: string; to: string }

/** Một cột trên trục thời gian: node phía trên và/hoặc phía dưới trục. */
export interface ProcessTimelineColumn {
  top?: ProcessFlowNode
  bottom?: ProcessFlowNode
  /** Node nằm ngay trên trục (chỉ dùng cho nhánh nguồn `lead`, vd Đơn đặt hàng ở Bán hàng). */
  middle?: ProcessFlowNode
}

export function ProcessDashboard({
  title,
  sources,
  center,
  timeline,
  timelineLead,
  shortcuts,
  reports,
}: {
  title: string
  /** Các node nguồn bên trái (Thu tiền, Chi tiền…), gộp nhánh về node giữa. */
  sources?: ProcessFlowNode[]
  /** Node giữa của sơ đồ (Kiểm kê quỹ, Đối chiếu ngân hàng…). */
  center?: ProcessFlowNode
  /** Trục thời gian ngang (Mua hàng, Bán hàng…): node xen kẽ trên/dưới trục. */
  timeline?: ProcessTimelineColumn[]
  /** Nhánh nguồn bên trái gộp vào đầu trục (vd Lệnh sản xuất / Lắp ráp ở phân hệ Kho). */
  timelineLead?: ProcessTimelineColumn
  shortcuts: ProcessShortcut[]
  /** Mỗi báo cáo: chuỗi (chưa có trang → nút chết) hoặc `{ label, to }` (dẫn link). */
  reports: ProcessReport[]
}) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
      {/* Cột trái: sơ đồ nghiệp vụ + hàng shortcut */}
      <div className="flex flex-col gap-3">
        <section className="rounded-lg border border-border bg-white">
          <h2 className="border-b border-border py-3 text-center text-sm font-bold uppercase tracking-wide text-slate-700">
            {title}
          </h2>

          {timeline ? (
            <ProcessTimeline columns={timeline} lead={timelineLead} />
          ) : (
            <div className="flex items-center justify-center gap-0 px-6 py-14">
              <div className="flex flex-col gap-20">
                {sources?.map((s) => (
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

              {center && <FlowNode {...center} />}
            </div>
          )}
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
          {reports.map((r) => {
            const label = typeof r === 'string' ? r : r.label
            const to = typeof r === 'string' ? undefined : r.to
            const cls =
              'flex w-full items-center gap-3 py-4 text-left text-sm text-slate-700 hover:text-primary'
            return (
              <li key={label} className="border-b border-border/70 last:border-b-0">
                {to ? (
                  <Link to={to} className={cls}>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    {label}
                  </Link>
                ) : (
                  <button type="button" title="Tính năng đang phát triển." className={cls}>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    {label}
                  </button>
                )}
              </li>
            )
          })}
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

// Node trong sơ đồ flow: icon + label, click điều hướng (nếu có) hoặc mở menu hành động.
function FlowNode({ label, icon, onClick, disabled, menu }: ProcessFlowNode) {
  if (menu?.length) {
    return (
      <Popover
        align="left"
        className="min-w-56 p-0"
        trigger={({ toggle }) => (
          <button type="button" onClick={toggle} className="group flex w-28 flex-col items-center gap-2">
            <span className="transition-transform group-hover:scale-105">{icon}</span>
            <span className="text-sm text-slate-700 group-hover:text-primary">{label}</span>
          </button>
        )}
      >
        {(close) => (
          <ul className="py-1">
            {menu.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => {
                    close()
                    item.onClick()
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-primary"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Popover>
    )
  }
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

// Trục thời gian ngang: mỗi cột có node trên/dưới trục, tick nối vào trục,
// mũi tên ở cuối trục (bố cục MISA phân hệ Mua/Bán hàng, Kho).
// `lead` (tùy chọn): nhánh nguồn bên trái (2 node trên/dưới) gộp vào đầu trục.
function ProcessTimeline({
  columns,
  lead,
}: {
  columns: ProcessTimelineColumn[]
  lead?: ProcessTimelineColumn
}) {
  const n = columns.length
  // Khi có lead: 1 cột node nguồn + 1 cột nhánh gộp, rồi tới các cột trên trục.
  const gridTemplateColumns = lead
    ? `auto 44px repeat(${n}, minmax(0, 1fr))`
    : `repeat(${n}, minmax(0, 1fr))`
  const axisColStart = lead ? 3 : 1
  return (
    <div className="px-6 py-10">
      <div className="grid" style={{ gridTemplateColumns, gridTemplateRows: 'auto auto auto' }}>
        {/* Nhánh nguồn bên trái + nhánh gộp hình [ về đầu trục */}
        {lead && (
          <>
            <div
              className="flex justify-center px-2 pb-6"
              style={{ gridColumn: 1, gridRow: 1 }}
            >
              {lead.top && <FlowNode {...lead.top} />}
            </div>
            <div
              className="flex justify-center px-2 pt-6"
              style={{ gridColumn: 1, gridRow: 3 }}
            >
              {lead.bottom && <FlowNode {...lead.bottom} />}
            </div>
            {/* Node giữa (trên trục), vd Đơn đặt hàng ở phân hệ Bán hàng */}
            {lead.middle && (
              <div className="flex justify-center px-2" style={{ gridColumn: 1, gridRow: 2 }}>
                <FlowNode {...lead.middle} />
              </div>
            )}
            {/* Vạch dọc nối các node nguồn (span cả 3 hàng) */}
            <div className="relative" style={{ gridColumn: 2, gridRow: '1 / 4' }}>
              <div className="absolute left-0 top-[18%] bottom-[18%] w-px bg-emerald-600/40" />
            </div>
            {/* Arm ngang gộp vào đầu trục — cùng hộp my-1 h-6 như trục để liền mạch (row 2 cao do node giữa) */}
            <div className="relative my-1 h-6" style={{ gridColumn: 2, gridRow: 2 }}>
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-emerald-600/40" />
            </div>
          </>
        )}

        {/* Hàng node phía trên trục */}
        {columns.map((c, i) => (
          <div
            key={`t${i}`}
            className="flex justify-center px-2 pb-6"
            style={{ gridColumn: axisColStart + i, gridRow: 1 }}
          >
            {c.top && <FlowNode {...c.top} />}
          </div>
        ))}

        {/* Trục ngang + tick + mũi tên (trải hết các cột trên trục) */}
        <div
          className="relative my-1 h-6"
          style={{ gridColumn: `${axisColStart} / -1`, gridRow: 2 }}
        >
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-emerald-600/40" />
          <svg
            width="14"
            height="12"
            viewBox="0 0 14 12"
            className="absolute right-0 top-1/2 -translate-y-1/2 text-emerald-600/40"
            aria-hidden
          >
            <path d="M0 1 L13 6 L0 11 Z" fill="currentColor" />
          </svg>
          <div
            className="grid h-6"
            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
          >
            {columns.map((_, i) => (
              <span key={`k${i}`} className="mx-auto h-6 w-px bg-emerald-600/40" />
            ))}
          </div>
        </div>

        {/* Hàng node phía dưới trục */}
        {columns.map((c, i) => (
          <div
            key={`b${i}`}
            className="flex justify-center px-2 pt-6"
            style={{ gridColumn: axisColStart + i, gridRow: 3 }}
          >
            {c.bottom && <FlowNode {...c.bottom} />}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---- Icon sơ đồ quy trình (phong cách MISA) ---- */

// Đơn mua hàng: tờ đơn xanh + thùng hàng.
export function ProcessPurchaseOrderIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="16" y="5" width="22" height="27" rx="3" fill="#43a047" />
      <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
        <line x1="21" y1="12" x2="33" y2="12" />
        <line x1="21" y1="18" x2="33" y2="18" />
        <line x1="21" y1="24" x2="29" y2="24" />
      </g>
      <path d="M6 22 L15 19 L24 22 L24 34 L15 37 L6 34 Z" fill="#fbc02d" stroke="#fff" strokeWidth="1.5" />
      <path d="M6 22 L15 25 L24 22 M15 25 L15 37" stroke="#fff" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

// Nhận hàng hóa, dịch vụ: thùng hàng mở + dấu tích.
export function ProcessReceiveGoodsIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <path d="M8 16 L22 12 L36 16 L22 20 Z" fill="#fbc02d" stroke="#fff" strokeWidth="1.5" />
      <path d="M8 16 L8 32 L22 36 L22 20 Z" fill="#e0a800" stroke="#fff" strokeWidth="1.5" />
      <path d="M36 16 L36 32 L22 36 L22 20 Z" fill="#fbc02d" stroke="#fff" strokeWidth="1.5" />
      <circle cx="31" cy="30" r="8" fill="#43a047" />
      <path d="M27.5 30 l2.5 2.5 L35 27.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// Xử lý hóa đơn đầu vào: nút tròn xanh dương với tia (phong cách MISA eInvoice).
export function ProcessInvoiceInputIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <circle cx="22" cy="22" r="17" fill="#2f7bf5" />
      <g fill="#fff">
        <rect x="14" y="20.5" width="7" height="3" rx="1.5" transform="rotate(-30 14 20.5)" />
        <rect x="20" y="17.5" width="9" height="3" rx="1.5" transform="rotate(-30 20 17.5)" />
        <rect x="17" y="25.5" width="9" height="3" rx="1.5" transform="rotate(-30 17 25.5)" />
        <rect x="23" y="22.5" width="7" height="3" rx="1.5" transform="rotate(-30 23 22.5)" />
      </g>
    </svg>
  )
}

// Trả tiền theo hóa đơn: điện thoại + mũi tên chuyển tiền.
export function ProcessPayInvoiceIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="8" y="6" width="20" height="32" rx="3" fill="#43a047" />
      <rect x="11" y="10" width="14" height="20" rx="1.5" fill="#fff" opacity="0.9" />
      <rect x="14" y="33" width="8" height="2.5" rx="1.25" fill="#fff" opacity="0.9" />
      <rect x="26" y="24" width="12" height="10" rx="1.5" fill="#fbc02d" stroke="#fff" strokeWidth="1.5" />
      <circle cx="32" cy="29" r="2.2" fill="#fff" />
      <g stroke="#8bc34a" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M29 14 h8 M34 11 l3 3 l-3 3" />
        <path d="M37 20 h-8 M32 23 l-3-3 l3-3" />
      </g>
    </svg>
  )
}

// Hợp đồng mua hàng: tờ hợp đồng + con dấu.
export function ProcessContractIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <path d="M11 5 h16 l6 6 v28 h-22 Z" fill="#43a047" />
      <path d="M27 5 v6 h6 Z" fill="#2e7d32" />
      <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
        <line x1="15" y1="16" x2="29" y2="16" />
        <line x1="15" y1="21" x2="29" y2="21" />
        <line x1="15" y1="26" x2="24" y2="26" />
      </g>
      <circle cx="16" cy="34" r="6" fill="#fbc02d" stroke="#fff" strokeWidth="1.5" />
      <path d="M13.5 34 l1.8 1.8 L19 32" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// Nhận hóa đơn: tờ hóa đơn + ký hiệu tiền $.
export function ProcessInvoiceIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <path d="M10 5 h18 l6 6 v22 l-4 -2 l-4 2 l-4 -2 l-4 2 l-4 -2 l-4 2 Z" fill="#43a047" />
      <path d="M28 5 v6 h6 Z" fill="#2e7d32" />
      <g stroke="#fff" strokeWidth="1.6" strokeLinecap="round">
        <line x1="14" y1="24" x2="30" y2="24" />
        <line x1="14" y1="29" x2="30" y2="29" />
      </g>
      <text x="22" y="20" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">
        $
      </text>
    </svg>
  )
}

// Trả lại hàng mua: thùng hàng + mũi tên quay vòng.
export function ProcessPurchaseReturnIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <path d="M8 18 L20 14 L32 18 L32 34 L20 38 L8 34 Z" fill="#fbc02d" stroke="#fff" strokeWidth="1.5" />
      <path d="M8 18 L20 22 L32 18 M20 22 L20 38" stroke="#fff" strokeWidth="1.5" fill="none" />
      <path
        d="M30 10 a8 8 0 1 1 -7 -4"
        stroke="#43a047"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M23 4 l1 6 l-6 -1 Z" fill="#43a047" />
    </svg>
  )
}

// Giảm giá hàng mua: túi mua hàng + bánh răng.
export function ProcessPurchaseDiscountIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <path d="M12 15 h20 l2 22 h-24 Z" fill="#8bc34a" stroke="#fff" strokeWidth="1.5" />
      <path d="M17 15 a5 5 0 0 1 10 0" fill="none" stroke="#fff" strokeWidth="1.8" />
      <g transform="translate(28 26)">
        <circle r="8" fill="#43a047" />
        <circle r="3" fill="#fff" />
        <g stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <line x1="0" y1="-8" x2="0" y2="-5" />
          <line x1="0" y1="5" x2="0" y2="8" />
          <line x1="-8" y1="0" x2="-5" y2="0" />
          <line x1="5" y1="0" x2="8" y2="0" />
        </g>
      </g>
    </svg>
  )
}

/* ---- Icon sơ đồ quy trình phân hệ Bán hàng (phong cách MISA) ---- */

// Báo giá: tờ báo giá $ + thùng hàng.
export function ProcessQuotationIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="16" y="5" width="22" height="27" rx="3" fill="#43a047" />
      <path d="M16 5 h6 v6 h-6 Z" fill="#2e7d32" />
      <text x="27" y="17" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">
        $
      </text>
      <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
        <line x1="21" y1="23" x2="33" y2="23" />
        <line x1="21" y1="28" x2="29" y2="28" />
      </g>
      <path d="M6 22 L15 19 L24 22 L24 34 L15 37 L6 34 Z" fill="#fbc02d" stroke="#fff" strokeWidth="1.5" />
      <path d="M6 22 L15 25 L24 22 M15 25 L15 37" stroke="#fff" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

// Đơn đặt hàng: thùng hàng vàng + dấu tích xanh.
export function ProcessSalesOrderIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <path d="M8 16 L22 12 L36 16 L22 20 Z" fill="#fbc02d" stroke="#fff" strokeWidth="1.5" />
      <path d="M8 16 L8 32 L22 36 L22 20 Z" fill="#e0a800" stroke="#fff" strokeWidth="1.5" />
      <path d="M36 16 L36 32 L22 36 L22 20 Z" fill="#fbc02d" stroke="#fff" strokeWidth="1.5" />
      <circle cx="13" cy="14" r="7" fill="#43a047" />
      <path d="M9.5 14 l2.5 2.5 L17 11" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// Ghi nhận doanh thu: tờ báo cáo + biểu đồ đường đi lên + dấu tích.
export function ProcessRevenueIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="6" y="5" width="26" height="33" rx="3" fill="#43a047" />
      <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M11 22 l5 -5 l4 4 l7 -8" />
        <path d="M23 13 h4 v4" />
      </g>
      <g stroke="#fff" strokeWidth="1.6" strokeLinecap="round">
        <line x1="11" y1="29" x2="27" y2="29" />
        <line x1="11" y1="33" x2="21" y2="33" />
      </g>
      <circle cx="32" cy="31" r="8" fill="#8bc34a" stroke="#fff" strokeWidth="1.2" />
      <path d="M28.5 31 l2.5 2.5 L36 29.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// Trả lại hàng bán: thùng hàng + mũi tên quay vòng (hàng quay về).
export function ProcessSalesReturnIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="6" y="6" width="20" height="20" rx="3" fill="#43a047" />
      <path
        d="M22 16 a8 8 0 1 0 -3 6.2"
        stroke="#fff"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M22 8 l2 6 l-6 0.5 Z" fill="#fff" />
      <path d="M14 26 L26 22 L38 26 L38 38 L26 42 L14 38 Z" fill="#fbc02d" stroke="#fff" strokeWidth="1.5" />
      <path d="M14 26 L26 30 L38 26 M26 30 L26 42" stroke="#fff" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

// Thu tiền theo hóa đơn: điện thoại + thẻ + mũi tên thu tiền vào.
export function ProcessCollectInvoiceIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="8" y="6" width="20" height="32" rx="3" fill="#43a047" />
      <rect x="11" y="10" width="14" height="20" rx="1.5" fill="#fff" opacity="0.9" />
      <rect x="14" y="33" width="8" height="2.5" rx="1.25" fill="#fff" opacity="0.9" />
      <rect x="26" y="24" width="12" height="10" rx="1.5" fill="#fbc02d" stroke="#fff" strokeWidth="1.5" />
      <circle cx="32" cy="29" r="2.2" fill="#fff" />
      <g stroke="#8bc34a" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M37 14 h-8 M34 11 l-3 3 l3 3" />
        <path d="M29 20 h8 M32 23 l3 -3 l-3 -3" />
      </g>
    </svg>
  )
}

// Giảm giá hàng bán: thùng hàng + badge giảm giá (bánh răng).
export function ProcessSalesDiscountIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <path d="M6 16 L18 12 L30 16 L30 32 L18 36 L6 32 Z" fill="#8bc34a" stroke="#fff" strokeWidth="1.5" />
      <path d="M6 16 L18 20 L30 16 M18 20 L18 36" stroke="#fff" strokeWidth="1.5" fill="none" />
      <g transform="translate(31 30)">
        <circle r="8" fill="#43a047" stroke="#fff" strokeWidth="1.2" />
        <circle r="3" fill="#fff" />
        <g stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <line x1="0" y1="-8" x2="0" y2="-5" />
          <line x1="0" y1="5" x2="0" y2="8" />
          <line x1="-8" y1="0" x2="-5" y2="0" />
          <line x1="5" y1="0" x2="8" y2="0" />
        </g>
      </g>
    </svg>
  )
}

/* ---- Icon sơ đồ quy trình phân hệ Kho (phong cách MISA) ---- */

// Lệnh sản xuất: tờ lệnh xanh + dấu tích + thùng hàng.
export function ProcessProductionOrderIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="6" y="6" width="24" height="30" rx="3" fill="#8bc34a" />
      <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
        <line x1="16" y1="20" x2="26" y2="20" />
        <line x1="16" y1="25" x2="26" y2="25" />
        <line x1="16" y1="30" x2="22" y2="30" />
      </g>
      <circle cx="16" cy="14" r="7" fill="#43a047" />
      <path d="M12.5 14 l2.5 2.5 L20 11" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M26 26 h11 v11 h-11 Z" fill="#fbc02d" stroke="#fff" strokeWidth="1.5" />
      <path d="M26 30 h11 M31.5 26 v11" stroke="#fff" strokeWidth="1.2" />
    </svg>
  )
}

// Lắp ráp, tháo dỡ: tờ lệnh xanh + dấu tích + cờ lê/tua vít bắt chéo.
export function ProcessAssemblyIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="6" y="6" width="24" height="30" rx="3" fill="#8bc34a" />
      <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
        <line x1="16" y1="20" x2="26" y2="20" />
        <line x1="16" y1="25" x2="26" y2="25" />
        <line x1="16" y1="30" x2="22" y2="30" />
      </g>
      <circle cx="16" cy="14" r="7" fill="#43a047" />
      <path d="M12.5 14 l2.5 2.5 L20 11" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
      <g transform="translate(30 30) rotate(45)">
        <rect x="-2" y="-9" width="4" height="14" rx="1" fill="#fbc02d" />
        <path d="M-3 -9 h6 v-3 h-6 Z" fill="#e0a800" />
      </g>
      <g transform="translate(30 30) rotate(-45)">
        <rect x="-2" y="-9" width="4" height="14" rx="1" fill="#43a047" />
        <circle cx="0" cy="-9" r="3.2" fill="#2e7d32" />
      </g>
    </svg>
  )
}

// Nhà kho (mái + tường) — motif dùng chung cho Xuất/Nhập/Chuyển kho.
function WarehouseShell() {
  return (
    <>
      <path d="M4 16 L22 8 L40 16 L40 20 L4 20 Z" fill="#2e7d32" />
      <rect x="7" y="20" width="30" height="18" rx="1.5" fill="#43a047" />
    </>
  )
}

// Xuất kho: nhà kho + xe tải chở hàng ra.
export function ProcessWarehouseOutIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <WarehouseShell />
      <rect x="11" y="24" width="9" height="9" fill="#fbc02d" stroke="#fff" strokeWidth="1.2" />
      <g fill="#8bc34a" stroke="#fff" strokeWidth="1.2">
        <rect x="22" y="28" width="10" height="7" />
        <path d="M32 30 h4 l2 3 v2 h-6 Z" />
      </g>
      <g fill="#2e7d32">
        <circle cx="25" cy="36" r="2" />
        <circle cx="35" cy="36" r="2" />
      </g>
    </svg>
  )
}

// Chuyển kho: nhà kho + mũi tên hai chiều + xe tải.
export function ProcessTransferIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <WarehouseShell />
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M13 26 h9 M13 26 l3 -3 M13 26 l3 3" />
        <path d="M31 31 h-9 M31 31 l-3 -3 M31 31 l-3 3" />
      </g>
      <g fill="#fbc02d" stroke="#fff" strokeWidth="1.2">
        <rect x="24" y="30" width="8" height="5" />
        <path d="M32 31 h3 l2 2 v2 h-5 Z" />
      </g>
      <g fill="#2e7d32">
        <circle cx="27" cy="36" r="1.8" />
        <circle cx="35" cy="36" r="1.8" />
      </g>
    </svg>
  )
}

// Nhập kho: nhà kho + thùng hàng đưa vào.
export function ProcessWarehouseInIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <WarehouseShell />
      <g fill="#fbc02d" stroke="#fff" strokeWidth="1.2">
        <rect x="12" y="29" width="8" height="6" />
        <rect x="21" y="26" width="8" height="9" />
        <rect x="30" y="30" width="6" height="5" />
      </g>
      <path d="M12 35 h24" stroke="#fff" strokeWidth="1.2" />
    </svg>
  )
}

// Tính giá xuất kho: máy tính + thùng hàng.
export function ProcessValuationIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="6" y="6" width="22" height="32" rx="3" fill="#43a047" />
      <rect x="10" y="10" width="14" height="7" rx="1" fill="#8bc34a" />
      <g fill="#fff">
        <circle cx="13" cy="22" r="1.6" />
        <circle cx="17" cy="22" r="1.6" />
        <circle cx="21" cy="22" r="1.6" />
        <circle cx="13" cy="27" r="1.6" />
        <circle cx="17" cy="27" r="1.6" />
        <circle cx="21" cy="27" r="1.6" />
        <circle cx="13" cy="32" r="1.6" />
        <circle cx="17" cy="32" r="1.6" />
        <circle cx="21" cy="32" r="1.6" />
      </g>
      <path d="M27 26 h11 v12 h-11 Z" fill="#fbc02d" stroke="#fff" strokeWidth="1.5" />
      <path d="M27 30 h11 M32.5 26 v12" stroke="#fff" strokeWidth="1.2" />
    </svg>
  )
}

// Kiểm kê: bảng checklist xanh + thùng hàng vàng.
export function ProcessStocktakeIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="6" y="5" width="24" height="33" rx="3" fill="#43a047" />
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M11 13 l2 2 L17 11" />
        <line x1="19" y1="13" x2="26" y2="13" />
        <path d="M11 21 l2 2 L17 19" />
        <line x1="19" y1="21" x2="26" y2="21" />
        <path d="M11 29 l2 2 L17 27" />
        <line x1="19" y1="29" x2="26" y2="29" />
      </g>
      <path d="M28 27 h11 v11 h-11 Z" fill="#fbc02d" stroke="#fff" strokeWidth="1.5" />
      <path d="M28 31 h11 M33.5 27 v11" stroke="#fff" strokeWidth="1.2" />
    </svg>
  )
}

/* ---- Icon shortcut danh mục bổ sung ---- */

// Kho: nhà kho nhìn ngang (outline).
export function ProcessWarehouseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10 L12 5 L21 10 V20 H3 Z" />
      <path d="M8 20 v-6 h8 v6" />
    </svg>
  )
}

// Đơn vị tính: thước kẻ.
export function ProcessRulerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="8" width="18" height="8" rx="1" transform="rotate(-45 12 12)" />
      <path d="M9 9 l1.5 1.5 M12 12 l1.5 1.5 M15 6 l1.5 1.5" />
    </svg>
  )
}


// Hàng hóa, dịch vụ: khối hộp xếp chồng.
export function ProcessCubeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3 L20 7 L12 11 L4 7 Z" />
      <path d="M4 7 v8 l8 4 v-8" />
      <path d="M20 7 v8 l-8 4" />
    </svg>
  )
}

// Tiện ích: hai công cụ bắt chéo (cờ lê + búa).
export function ProcessToolsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 20 L13 11 M9 5 a4 4 0 0 0 5 5 l6 6 a2 2 0 0 1 -3 3 l-6 -6 a4 4 0 0 1 -5 -5 l3 3 l2 -2 Z" />
    </svg>
  )
}

/* ---- Icon sơ đồ quy trình cũ (phong cách MISA) ---- */

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

/* ---- Icon sơ đồ quy trình phân hệ Tổng hợp (phong cách MISA) ---- */

// Quyết toán tạm ứng: tờ phiếu $ chồng nhau + bánh răng.
export function ProcessAdvanceSettleIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="6" y="8" width="24" height="28" rx="3" fill="#8bc34a" />
      <rect x="11" y="4" width="24" height="28" rx="3" fill="#fbc02d" stroke="#fff" strokeWidth="1.2" />
      <text x="23" y="20" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">
        $
      </text>
      <g transform="translate(30 30)">
        <circle r="8" fill="#43a047" stroke="#fff" strokeWidth="1.2" />
        <circle r="3" fill="#fff" />
        <g stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <line x1="0" y1="-8" x2="0" y2="-5" />
          <line x1="0" y1="5" x2="0" y2="8" />
          <line x1="-8" y1="0" x2="-5" y2="0" />
          <line x1="5" y1="0" x2="8" y2="0" />
        </g>
      </g>
    </svg>
  )
}

// Chứng từ nghiệp vụ khác: chồng chứng từ + badge "…".
export function ProcessOtherVoucherIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="5" y="7" width="22" height="28" rx="3" fill="#8bc34a" />
      <rect x="10" y="4" width="22" height="28" rx="3" fill="#43a047" stroke="#fff" strokeWidth="1.2" />
      <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
        <line x1="15" y1="12" x2="27" y2="12" />
        <line x1="15" y1="17" x2="27" y2="17" />
        <line x1="15" y1="22" x2="23" y2="22" />
      </g>
      <circle cx="32" cy="32" r="8" fill="#fbc02d" stroke="#fff" strokeWidth="1.2" />
      <g fill="#fff">
        <circle cx="29" cy="32" r="1.3" />
        <circle cx="32" cy="32" r="1.3" />
        <circle cx="35" cy="32" r="1.3" />
      </g>
    </svg>
  )
}

// Kết chuyển lãi lỗ: 2 thẻ chồng nhau + biểu đồ đường đi lên.
export function ProcessProfitTransferIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="6" y="10" width="22" height="24" rx="3" fill="#8bc34a" />
      <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M11 27 l4 -4 l3 3 l5 -6" />
        <path d="M20 20 h4 v4" />
      </g>
      <rect x="20" y="6" width="18" height="20" rx="2.5" fill="#fbc02d" stroke="#fff" strokeWidth="1.2" />
      <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M24 20 l3 -3 l2.5 2.5 l4 -5" />
        <path d="M30 14 h3.5 v3.5" />
      </g>
    </svg>
  )
}

// Khóa sổ kỳ kế toán: cặp tài liệu + ổ khóa.
export function ProcessLockBookIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <path d="M6 12 h14 l3 4 h15 v20 a2 2 0 0 1 -2 2 h-28 a2 2 0 0 1 -2 -2 Z" fill="#fbc02d" />
      <path d="M6 12 h14 l3 4 h-17 Z" fill="#f9a825" />
      <rect x="17" y="22" width="14" height="12" rx="2" fill="#43a047" stroke="#fff" strokeWidth="1.2" />
      <path d="M20 22 v-2.5 a4 4 0 0 1 8 0 V22" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="24" cy="27" r="2" fill="#fff" />
      <rect x="23.2" y="27" width="1.6" height="4" rx="0.8" fill="#fff" />
    </svg>
  )
}

// Lập báo cáo tài chính: tờ báo cáo + biểu đồ cột + bút chỉnh sửa.
export function ProcessFinReportIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="8" y="4" width="26" height="34" rx="3" fill="#43a047" />
      <text x="14" y="14" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">
        $
      </text>
      <g fill="#8bc34a">
        <rect x="20" y="12" width="3.5" height="6" rx="0.8" />
        <rect x="25" y="9" width="3.5" height="9" rx="0.8" />
        <rect x="30" y="14" width="3.5" height="4" rx="0.8" />
      </g>
      <g stroke="#fff" strokeWidth="1.6" strokeLinecap="round">
        <line x1="13" y1="23" x2="29" y2="23" />
        <line x1="13" y1="28" x2="29" y2="28" />
        <line x1="13" y1="33" x2="23" y2="33" />
      </g>
      <path d="M32 30 l8 -8 l4 4 l-8 8 l-5 1 Z" fill="#fbc02d" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

/* ---- Icon shortcut danh mục phân hệ Tổng hợp ---- */

// Hệ thống tài khoản: sơ đồ khối phân cấp.
export function ProcessAccountTreeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="9" y="2.5" width="6" height="5" rx="1" />
      <rect x="2.5" y="16" width="6" height="5" rx="1" />
      <rect x="15.5" y="16" width="6" height="5" rx="1" />
      <path d="M12 7.5v4M5.5 16v-2.5h13V16" />
    </svg>
  )
}

// Mã thống kê: biểu đồ đường trong khung.
export function ProcessStatChartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2.5" y="3.5" width="19" height="17" rx="2" />
      <path d="M6 15 l3.5 -4 l3 2.5 l4.5 -6" />
      <path d="M15 7.5 h3 v3" />
    </svg>
  )
}

// Khoản mục chi phí: tờ chứng từ có ký hiệu $.
export function ProcessCostItemIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 2.5 h8 l4 4 v15 h-12 Z" />
      <path d="M14 2.5 v4 h4" />
      <path d="M9.5 14 h3.5 a1.5 1.5 0 0 0 0 -3 h-2 a1.5 1.5 0 0 1 0 -3 h3.5M11.5 8.5 v-1M11.5 15 v-1" />
    </svg>
  )
}
