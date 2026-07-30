import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { ChevronDownIcon, SearchIcon } from '@/shared/ui/icons'

// VTHH chọn được trong picker (§ Mã hàng — MISA).
export interface ItemOption {
  code: string // Mã VTHH
  name: string // Tên VTHH
  unit?: string | null // Đơn vị tính
  // Dữ liệu ngầm định của VTHH — form chứng từ dùng để tự điền dòng hàng.
  defaultWarehouseCode?: string | null // Kho ngầm định
  inventoryAccount?: string | null // TK Kho
  costAccount?: string | null // TK chi phí / giá vốn
  purchasePrice?: string | null // Đơn giá mua gần nhất (Decimal → string)
  salePrice?: string | null // Đơn giá bán 1 (Decimal → string)
  vatRate?: string | null // Thuế suất GTGT ("10"/"8"/"KCT"/…)
}

interface Props {
  value?: string // mã VTHH đang chọn
  items: ItemOption[]
  loading?: boolean
  keyword: string
  onKeywordChange: (s: string) => void
  onSelect: (item: ItemOption) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  inputClassName?: string
  // Cho gõ mã ngoài danh mục (dữ liệu nhập khẩu) — chốt giá trị khi rời ô.
  allowFreeText?: boolean
}

// Combobox tra cứu VTHH: input mã + dropdown bảng (Mã/Tên/ĐVT) —
// cùng pattern PartnerPicker. Nguồn dữ liệu do parent truyền qua `items`.
export function ItemPicker({
  value,
  items,
  loading,
  keyword,
  onKeywordChange,
  onSelect,
  placeholder = 'Mã VTHH',
  disabled,
  className,
  inputClassName,
  allowFreeText,
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
    const width = Math.min(Math.max(r.width, 480), window.innerWidth - 24)
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

  const pick = (item: ItemOption) => {
    onSelect(item)
    setOpen(false)
    onKeywordChange('')
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
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
        onBlur={() => {
          // Gõ tay: chốt mã đã nhập nếu rời ô mà không chọn trong bảng.
          const kw = keyword.trim()
          if (allowFreeText && open && kw && kw !== value) onSelect({ code: kw, name: '' })
        }}
        onKeyDown={(e) => {
          const first = items[0]
          if (e.key === 'Enter' && open && first) {
            e.preventDefault()
            pick(first)
          }
        }}
        className={cn(
          'h-8 w-full rounded-md border border-border pr-7 pl-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-slate-50',
          inputClassName,
        )}
      />
      <ChevronDownIcon
        size={14}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
      />

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
                  <th className="px-3 py-1.5">Mã VTHH</th>
                  <th className="px-3 py-1.5">Tên VTHH</th>
                  <th className="px-3 py-1.5">ĐVT</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                      Đang tải…
                    </td>
                  </tr>
                )}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                      Không có VTHH phù hợp.
                    </td>
                  </tr>
                )}
                {!loading &&
                  items.map((item) => (
                    <tr
                      key={item.code}
                      onMouseDown={(e) => e.preventDefault()} // giữ focus, tránh onBlur ghi đè
                      onClick={() => pick(item)}
                      className="cursor-pointer border-t border-border hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-3 py-1.5 font-medium text-slate-700">
                        {item.code}
                      </td>
                      <td className="max-w-[280px] truncate px-3 py-1.5 text-slate-700">
                        {item.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                        {item.unit ?? ''}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-1.5 border-t border-border bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
            <SearchIcon size={13} /> Tìm nhanh theo mã / tên
          </div>
        </div>
      )}
    </div>
  )
}
