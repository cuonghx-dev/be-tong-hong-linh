import { PartnerType } from '@app/shared'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { ChevronDownIcon, PlusIcon, SearchIcon } from '@/shared/ui/icons'

// Đối tượng chọn được trong picker (§ Mã đối tượng — MISA).
export interface PartnerOption {
  code: string // Mã đối tượng
  name: string // Tên đối tượng
  type: PartnerType // Loại đối tượng
  taxCode?: string | null
  address?: string | null
  phone?: string | null
}

const TYPE_LABEL: Record<PartnerType, string> = {
  [PartnerType.Customer]: 'Khách hàng',
  [PartnerType.Supplier]: 'Nhà cung cấp',
  [PartnerType.Employee]: 'Nhân viên',
}

interface Props {
  value?: string // mã đối tượng đang chọn
  items: PartnerOption[]
  loading?: boolean
  keyword: string
  onKeywordChange: (s: string) => void
  onSelect: (p: PartnerOption) => void
  onAddNew?: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

// Combobox tra cứu đối tượng: input mã + dropdown bảng (Mã/Tên/MST/Địa chỉ/ĐT/Loại).
// Nguồn dữ liệu do parent truyền qua `items` → sau nối endpoint /partners.
export function PartnerPicker({
  value,
  items,
  loading,
  keyword,
  onKeywordChange,
  onSelect,
  onAddNew,
  placeholder = 'Mã đối tượng',
  disabled,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const openPanel = () => {
    const el = inputRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    // Bảng rộng hơn input; giới hạn để không tràn màn hình.
    const width = Math.min(Math.max(r.width, 680), window.innerWidth - 24)
    const left = Math.min(r.left, window.innerWidth - width - 12)
    setPos({ top: r.bottom + 4, left, width })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (
        !panelRef.current?.contains(e.target as Node) &&
        !wrapRef.current?.contains(e.target as Node)
      )
        setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    // Chỉ đóng khi scroll NGOÀI picker — text tràn ô input hay cuộn danh sách
    // trong panel cũng phát scroll (capture), không được làm đóng panel.
    const close = (e: Event) => {
      if (
        e.target instanceof Node &&
        (wrapRef.current?.contains(e.target) || panelRef.current?.contains(e.target))
      )
        return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const pick = (p: PartnerOption) => {
    onSelect(p)
    setOpen(false)
    onKeywordChange('')
  }

  return (
    <div ref={wrapRef} className={cn('flex gap-1.5', className)}>
      <div className="relative flex-1">
        <input
          ref={inputRef}
          disabled={disabled}
          value={open ? keyword : (value ?? '')}
          placeholder={placeholder}
          onFocus={openPanel}
          onChange={(e) => {
            if (!open) openPanel()
            onKeywordChange(e.target.value)
          }}
          className="h-9 w-full rounded-md border border-border pr-7 pl-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-slate-50"
        />
        <ChevronDownIcon
          size={14}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
      {onAddNew && (
        <button
          type="button"
          disabled={disabled}
          onClick={onAddNew}
          aria-label="Thêm đối tượng"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
        >
          <PlusIcon size={16} />
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
          className="z-50 overflow-hidden rounded-md border border-border bg-white shadow-lg"
        >
          <div className="max-h-72 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-1.5">Đối&nbsp;tượng</th>
                  <th className="px-3 py-1.5">Tên đối&nbsp;tượng</th>
                  <th className="px-3 py-1.5">Mã&nbsp;số thuế</th>
                  <th className="px-3 py-1.5">Địa&nbsp;chỉ</th>
                  <th className="px-3 py-1.5">Điện&nbsp;thoại</th>
                  <th className="px-3 py-1.5">Loại đối&nbsp;tượng</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                      Đang tải…
                    </td>
                  </tr>
                )}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                      Không có đối tượng phù hợp.
                    </td>
                  </tr>
                )}
                {!loading &&
                  items.map((p) => (
                    <tr
                      key={`${p.type}-${p.code}`}
                      onClick={() => pick(p)}
                      className="cursor-pointer border-t border-border hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-3 py-1.5 font-medium text-slate-700">
                        {p.code}
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-1.5 text-slate-700">{p.name}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                        {p.taxCode ?? ''}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-1.5 text-slate-600">
                        {p.address ?? ''}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                        {p.phone ?? ''}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                        {TYPE_LABEL[p.type]}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-1.5 border-t border-border bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
            <SearchIcon size={13} /> Tìm nhanh
          </div>
        </div>
      )}
    </div>
  )
}
