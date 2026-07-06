import { useState, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { HelpIcon, SettingsIcon } from '@/shared/ui/icons'

export interface ModuleTab {
  key: string
  label: string
  render: () => ReactNode
}

// Khung "tabs trên + content dưới" cho mỗi phân hệ (§2 design.md).
export function ModuleContent({ tabs, defaultTab }: { tabs: ModuleTab[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key)
  const current = tabs.find((t) => t.key === active) ?? tabs[0]

  return (
    <div className="flex h-full flex-col">
      {/* Tabs bar */}
      <div className="sticky top-0 z-10 flex items-center border-b border-border bg-white px-3">
        <nav className="flex overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              aria-selected={t.key === active}
              className={cn(
                'whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors',
                t.key === active
                  ? 'border-primary font-medium text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 pl-2">
          <button className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100">
            <HelpIcon size={18} />
          </button>
          <button className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100">
            <SettingsIcon size={18} />
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">{current?.render()}</div>
    </div>
  )
}
