import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChartIcon, ChevronDownIcon, SearchIcon } from '@/shared/ui/icons'
import { Input } from '@/shared/ui/input'
import { GENERAL_REPORT_GROUPS } from '../types'
import { Card } from '@/shared/ui/card'

// Tab "Báo cáo" phân hệ Tổng hợp: danh mục báo cáo nhóm accordion (như MISA),
// gồm cả báo cáo các phân hệ khác (link chéo). Click 1 báo cáo → trang xem
// full-page. Tìm theo tên → tự mở các nhóm có kết quả khớp.
export function GeneralReportListTab() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const kw = keyword.trim().toLowerCase()
  const groups = GENERAL_REPORT_GROUPS.map((g) => ({
    ...g,
    reports: g.reports.filter((r) => r.name.toLowerCase().includes(kw)),
  })).filter((g) => g.reports.length > 0)

  const toggle = (title: string) => {
    const next = new Set(collapsed)
    if (next.has(title)) next.delete(title)
    else next.add(title)
    setCollapsed(next)
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative w-64">
        <SearchIcon
          size={15}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <Input
          placeholder="Tìm theo tên báo cáo"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="h-8 pl-8 pr-2"
        />
      </div>

      <div className="flex flex-col gap-2">
        {groups.length === 0 && (
          <Card className="px-3 py-10 text-center text-slate-400">
            Không tìm thấy báo cáo phù hợp.
          </Card>
        )}
        {groups.map((g) => {
          // Đang tìm kiếm thì luôn mở nhóm có kết quả.
          const isOpen = kw !== '' || !collapsed.has(g.title)
          return (
            <Card key={g.title} className="overflow-hidden">
              <button
                onClick={() => toggle(g.title)}
                className="flex w-full items-center justify-between bg-slate-100 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                <span>{g.title}</span>
                <ChevronDownIcon
                  size={16}
                  className={`text-slate-500 transition-transform ${isOpen ? '' : '-rotate-90'}`}
                />
              </button>
              {isOpen && (
                <div className="grid grid-cols-1 gap-x-8 p-2 lg:grid-cols-2">
                  {g.reports.map((r) => (
                    <button
                      key={r.path}
                      onClick={() => navigate(r.path)}
                      className="flex items-center justify-between border-b border-border px-3 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <span>{r.name}</span>
                      <ChartIcon size={16} className="shrink-0 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
