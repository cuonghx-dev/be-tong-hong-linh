import type { BankAccountDto } from '@app/shared'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useBankAccounts } from '@/features/catalog'
import { cn } from '@/shared/lib/cn'
import { ChevronDownIcon, PlusIcon, SearchIcon } from '@/shared/ui/icons'
import { Input } from '@/shared/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

interface Props {
  value?: string // số tài khoản đang chọn
  onSelect: (a: BankAccountDto) => void
  // Nhận số TK đang gõ dở để dialog tạo nhanh điền sẵn.
  onAddNew?: (keyword: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

// Combobox tra cứu tài khoản ngân hàng từ danh mục TKNH: input số TK + dropdown
// bảng (Số TK/Tên NH/Chi nhánh NH/Chủ TK). Danh mục nhỏ → nạp 1 lần, lọc client.
export function BankAccountPicker({
  value,
  onSelect,
  onAddNew,
  placeholder = 'Số TK ngân hàng',
  disabled,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useBankAccounts({ page: 1, pageSize: 200, isActive: true })
  const items = useMemo(() => {
    const all = data?.data ?? []
    const kw = keyword.trim().toLowerCase()
    if (!kw) return all
    return all.filter(
      (a) =>
        a.accountNumber.toLowerCase().includes(kw) ||
        a.bankName.toLowerCase().includes(kw) ||
        (a.bankBranch ?? '').toLowerCase().includes(kw),
    )
  }, [data?.data, keyword])

  const openPanel = () => {
    const el = inputRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    // Bảng rộng hơn input; giới hạn để không tràn màn hình.
    const width = Math.min(Math.max(r.width, 560), window.innerWidth - 24)
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

  const pick = (a: BankAccountDto) => {
    onSelect(a)
    setOpen(false)
    setKeyword('')
  }

  return (
    <div ref={wrapRef} className={cn('flex gap-1.5', className)}>
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          disabled={disabled}
          value={open ? keyword : (value ?? '')}
          placeholder={placeholder}
          onFocus={openPanel}
          onChange={(e) => {
            if (!open) openPanel()
            setKeyword(e.target.value)
          }}
          className="pl-2 pr-7 disabled:bg-slate-50 disabled:opacity-100"
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
          onClick={() => {
            setOpen(false)
            onAddNew(keyword.trim())
          }}
          aria-label="Thêm tài khoản ngân hàng"
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-1.5">Số tài&nbsp;khoản</TableHead>
                  <TableHead className="py-1.5">Tên ngân&nbsp;hàng</TableHead>
                  <TableHead className="py-1.5">Chi nhánh&nbsp;NH</TableHead>
                  <TableHead className="py-1.5">Chủ tài&nbsp;khoản</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-slate-400">
                      Đang tải…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-slate-400">
                      Không có tài khoản phù hợp.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  items.map((a) => (
                    <TableRow
                      key={a.id}
                      onClick={() => pick(a)}
                      className="cursor-pointer"
                    >
                      <TableCell className="whitespace-nowrap py-1.5 font-medium text-slate-700">
                        {a.accountNumber}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate py-1.5 text-slate-700">
                        {a.bankName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-1.5 text-slate-600">
                        {a.bankBranch ?? ''}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate py-1.5 text-slate-600">
                        {a.accountHolder ?? ''}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center gap-1.5 border-t border-border bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
            <SearchIcon size={13} /> Tìm theo số TK / tên ngân hàng
          </div>
        </div>
      )}
    </div>
  )
}
