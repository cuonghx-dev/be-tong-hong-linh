import { ACCOUNT_NATURE_LABELS, type AccountDto } from '@app/shared'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAccountOptions } from '@/shared/api/useAccountOptions'
import { cn } from '@/shared/lib/cn'
import { ChevronDownIcon } from '@/shared/ui/icons'
import { Input } from '@/shared/ui/input'
import { PickerPanel } from '@/shared/ui/picker-panel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

// Kiểu ô TK trong bảng chi tiết chứng từ: spreadsheet — viền ẩn, hiện khi hover/focus.
// Chừa lề phải cho mũi tên dropdown.
export const accountCellCls =
  'h-8 w-full rounded border border-transparent bg-transparent pl-2 pr-5 text-sm transition-colors hover:border-slate-200 focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/20'

interface Props {
  value?: string | null // mã (số) tài khoản đang chọn
  onChange: (accountNumber: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  inputClassName?: string
}

// Combobox tra cứu tài khoản: input số TK + dropdown bảng (Số TK / Tên TK / Tính chất).
// Cùng pattern PartnerPicker/ItemPicker, nhưng tự lấy dữ liệu từ danh mục TK.
// Vẫn cho gõ tay (dữ liệu nhập khẩu có thể chứa TK ngoài danh mục).
export function AccountPicker({
  value,
  onChange,
  placeholder = 'Số TK',
  disabled,
  className,
  inputClassName,
}: Props) {
  const { items: accounts, loading: isLoading } = useAccountOptions()
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // TK tổng hợp = TK có con; theo TT 133/200 chỉ nên định khoản vào TK chi tiết.
  const parentIds = useMemo(
    () => new Set(accounts.map((a) => a.parentId).filter(Boolean) as string[]),
    [accounts],
  )

  const matches = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    const list = kw
      ? accounts.filter(
          (a) => a.number.toLowerCase().includes(kw) || a.name.toLowerCase().includes(kw),
        )
      : accounts
    return list.slice(0, 200)
  }, [accounts, keyword])

  const selected = useMemo(() => accounts.find((a) => a.number === value), [accounts, value])

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

  const pick = (a: AccountDto) => {
    onChange(a.number)
    setOpen(false)
    setKeyword('')
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <Input
        ref={inputRef}
        disabled={disabled}
        title={selected ? `${selected.number} — ${selected.name}` : undefined}
        value={open ? keyword : (value ?? '')}
        placeholder={placeholder}
        onFocus={openPanel}
        onChange={(e) => {
          if (!open) openPanel()
          setKeyword(e.target.value)
        }}
        onBlur={() => {
          // Gõ tay: chốt giá trị đã nhập nếu người dùng rời ô mà không chọn trong bảng.
          if (open && keyword.trim() && keyword.trim() !== value) onChange(keyword.trim())
        }}
        onKeyDown={(e) => {
          const first = matches[0]
          if (e.key === 'Enter' && open && first) {
            e.preventDefault()
            pick(first)
          }
        }}
        className={cn('h-8 pl-2 pr-6 disabled:bg-slate-50 disabled:opacity-100', inputClassName)}
      />
      <ChevronDownIcon
        size={13}
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
      />

      {open && (
        <PickerPanel ref={panelRef} pos={pos} anchor={inputRef.current} minWidth={420}>
          <div className="max-h-72 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-1.5">Số TK</TableHead>
                  <TableHead className="py-1.5">Tên tài khoản</TableHead>
                  <TableHead className="py-1.5">Tính chất</TableHead>
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
                      Không có tài khoản phù hợp.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  matches.map((a) => {
                    const isParent = parentIds.has(a.id)
                    return (
                      <TableRow
                        key={a.id}
                        onMouseDown={(e) => e.preventDefault()} // giữ focus, tránh onBlur ghi đè
                        onClick={() => pick(a)}
                        className="cursor-pointer"
                      >
                        <TableCell
                          className={cn(
                            'whitespace-nowrap px-3 py-1.5 font-medium',
                            isParent ? 'text-slate-400' : 'text-slate-700',
                          )}
                        >
                          {a.number}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'max-w-[260px] truncate px-3 py-1.5',
                            isParent ? 'text-slate-400' : 'text-slate-700',
                          )}
                        >
                          {a.name}
                          {isParent && (
                            <span className="ml-1.5 text-xs text-slate-400">(TK tổng hợp)</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-1.5 text-slate-600">
                          {ACCOUNT_NATURE_LABELS[a.nature]}
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </div>
        </PickerPanel>
      )}
    </div>
  )
}
