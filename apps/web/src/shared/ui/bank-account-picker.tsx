import type { BankAccountDto } from '@app/shared'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useBankAccounts } from '@/features/catalog'
import { cn } from '@/shared/lib/cn'
import { ChevronDownIcon, PlusIcon, SearchIcon } from '@/shared/ui/icons'

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
        <input
          ref={inputRef}
          disabled={disabled}
          value={open ? keyword : (value ?? '')}
          placeholder={placeholder}
          onFocus={openPanel}
          onChange={(e) => {
            if (!open) openPanel()
            setKeyword(e.target.value)
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
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-1.5">Số tài&nbsp;khoản</th>
                  <th className="px-3 py-1.5">Tên ngân&nbsp;hàng</th>
                  <th className="px-3 py-1.5">Chi nhánh&nbsp;NH</th>
                  <th className="px-3 py-1.5">Chủ tài&nbsp;khoản</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                      Đang tải…
                    </td>
                  </tr>
                )}
                {!isLoading && items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                      Không có tài khoản phù hợp.
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  items.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => pick(a)}
                      className="cursor-pointer border-t border-border hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-3 py-1.5 font-medium text-slate-700">
                        {a.accountNumber}
                      </td>
                      <td className="max-w-[240px] truncate px-3 py-1.5 text-slate-700">
                        {a.bankName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                        {a.bankBranch ?? ''}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-1.5 text-slate-600">
                        {a.accountHolder ?? ''}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-1.5 border-t border-border bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
            <SearchIcon size={13} /> Tìm theo số TK / tên ngân hàng
          </div>
        </div>
      )}
    </div>
  )
}
