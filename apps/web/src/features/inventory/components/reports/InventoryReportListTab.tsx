import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChartIcon, SearchIcon } from '@/shared/ui/icons'
import { Input } from '@/shared/ui/input'
import { INVENTORY_REPORTS } from '../../types'
import { Card } from '@/shared/ui/card'

// Tab "Báo cáo" phân hệ Kho: danh sách báo cáo 2 cột (như MISA),
// click 1 báo cáo → trang xem full-page /inventory/reports/<slug>.
export function InventoryReportListTab() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')

  const reports = INVENTORY_REPORTS.filter((r) =>
    r.name.toLowerCase().includes(keyword.trim().toLowerCase()),
  )

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

      <Card className="p-2">
        {reports.length === 0 && (
          <div className="px-3 py-10 text-center text-slate-400">
            Không tìm thấy báo cáo phù hợp.
          </div>
        )}
        <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
          {reports.map((r) => (
            <button
              key={r.slug}
              onClick={() => navigate(`/inventory/reports/${r.slug}`)}
              className="flex items-center justify-between border-b border-border px-3 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <span>{r.name}</span>
              <ChartIcon size={16} className="shrink-0 text-slate-400" />
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
