import { type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HelpIcon, SettingsIcon } from '@/shared/ui/icons'
import { TabBar } from '@/shared/ui/tab-bar'

export interface ModuleTab {
  key: string
  label: string
  render: () => ReactNode
}

// Khung "tabs trên + content dưới" cho mỗi phân hệ (§2 design.md).
// Tab đang mở lưu ở URL `?tab=` (share link, back/forward) — không dùng state cục bộ.
export function ModuleContent({
  tabs,
  defaultTab,
  actions,
}: {
  tabs: ModuleTab[]
  defaultTab?: string
  /** Nút hành động riêng của phân hệ, đặt bên phải tabs bar (trước Help/Settings). */
  actions?: ReactNode
}) {
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab') ?? defaultTab ?? tabs[0]?.key
  // `?tab=` không hợp lệ → rơi về tab đầu (active luôn khớp tab đang render).
  const current = tabs.find((t) => t.key === requested) ?? tabs[0]
  const active = current?.key

  // Đổi tab: chỉ giữ `tab`, bỏ các param còn lại (page/q/from/to… thuộc tab cũ).
  const setActive = (key: string) => setParams({ tab: key })

  return (
    <div className="flex h-full flex-col">
      {/* Tabs bar */}
      <div className="sticky top-0 z-10 flex items-center border-b border-border bg-white px-3">
        <TabBar
          size="nav"
          value={active ?? ''}
          onChange={setActive}
          items={tabs}
          className="overflow-x-auto"
        />
        <div className="ml-auto flex items-center gap-1 pl-2">
          {actions}
          <button className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100">
            <HelpIcon size={18} />
          </button>
          <button className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100">
            <SettingsIcon size={18} />
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">{current?.render()}</div>
    </div>
  )
}
