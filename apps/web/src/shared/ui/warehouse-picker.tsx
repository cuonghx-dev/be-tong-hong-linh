import { useEffect, useMemo, useRef, useState } from 'react'
import { useWarehouses } from '@/features/catalog'
import { cn } from '@/shared/lib/cn'
import { ChevronDownIcon, SearchIcon } from '@/shared/ui/icons'
import { Input } from '@/shared/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

// Kiểu ô Kho trong bảng dòng hàng: spreadsheet — viền ẩn, hiện khi hover/focus.
export const warehouseCellCls =
  'h-8 w-full rounded border border-transparent bg-transparent pl-2 pr-5 text-sm transition-colors hover:border-slate-200 focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/20'

interface Props {
  value?: string | null // mã kho đang chọn
  onChange: (warehouseCode: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  inputClassName?: string
}

// Combobox tra cứu kho: input mã kho + dropdown bảng (Mã kho / Tên kho / Địa chỉ).
// Cùng pattern AccountPicker — tự lấy dữ liệu từ danh mục Kho, vẫn cho gõ tay
// (dữ liệu nhập khẩu có thể chứa mã kho ngoài danh mục).
export function WarehousePicker({
  value,
  onChange,
  placeholder = 'Mã kho',
  disabled,
  className,
  inputClassName,
}: Props) {
  // Kho ít (vài chục) → nạp 1 lần, lọc tại client cho phản hồi tức thì.
  const { data, isLoading } = useWarehouses({ page: 1, pageSize: 200, isActive: true })
  const warehouses = useMemo(() => data?.data ?? [], [data])

  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const matches = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return warehouses
    return warehouses.filter(
      (w) => w.code.toLowerCase().includes(kw) || w.name.toLowerCase().includes(kw),
    )
  }, [warehouses, keyword])

  const selected = useMemo(() => warehouses.find((w) => w.code === value), [warehouses, value])

  const openPanel = () => {
    const el = inputRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    // Bảng rộng hơn input; giới hạn để không tràn màn hình.
    const width = Math.min(Math.max(r.width, 420), window.innerWidth - 24)
    const left = Math.min(r.left, window.innerWidth - width - 12)
    setPos({ top: r.bottom + 4, left, width })
    setKeyword('')
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

  const pick = (code: string) => {
    onChange(code)
    setOpen(false)
    setKeyword('')
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <Input
        ref={inputRef}
        disabled={disabled}
        title={selected ? `${selected.code} — ${selected.name}` : undefined}
        value={open ? keyword : (value ?? '')}
        placeholder={placeholder}
        onFocus={openPanel}
        onChange={(e) => {
          if (!open) openPanel()
          setKeyword(e.target.value)
        }}
        onBlur={() => {
          // Gõ tay: chốt mã kho đã nhập nếu rời ô mà không chọn trong bảng.
          if (open && keyword.trim() && keyword.trim() !== value) onChange(keyword.trim())
        }}
        onKeyDown={(e) => {
          const first = matches[0]
          if (e.key === 'Enter' && open && first) {
            e.preventDefault()
            pick(first.code)
          }
        }}
        className={cn('h-8 pl-2 pr-6 disabled:bg-slate-50 disabled:opacity-100', inputClassName)}
      />
      <ChevronDownIcon
        size={13}
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
      />

      {open && (
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
          className="z-50 overflow-hidden rounded-md border border-border bg-white shadow-lg"
        >
          <div className="max-h-72 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-1.5">Mã kho</TableHead>
                  <TableHead className="py-1.5">Tên kho</TableHead>
                  <TableHead className="py-1.5">Địa chỉ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-slate-400">
                      Đang tải…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && matches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-slate-400">
                      Không có kho phù hợp.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  matches.map((w) => (
                    <TableRow
                      key={w.id}
                      onMouseDown={(e) => e.preventDefault()} // giữ focus, tránh onBlur ghi đè
                      onClick={() => pick(w.code)}
                      className="cursor-pointer"
                    >
                      <TableCell className="whitespace-nowrap py-1.5 font-medium text-slate-700">
                        {w.code}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate py-1.5 text-slate-700">{w.name}</TableCell>
                      <TableCell className="max-w-[220px] truncate py-1.5 text-slate-600">
                        {w.address ?? ''}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center gap-1.5 border-t border-border bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
            <SearchIcon size={13} /> Tìm nhanh theo mã / tên kho
          </div>
        </div>
      )}
    </div>
  )
}
