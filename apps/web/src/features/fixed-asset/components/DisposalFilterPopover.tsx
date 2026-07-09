import { useEffect, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { ChevronDownIcon, FilterIcon } from '@/shared/ui/icons'
import { Popover } from '@/shared/ui/popover'

export interface DisposalFilterValue {
  from: string
  to: string
}

const EMPTY: DisposalFilterValue = { from: '', to: '' }

type Preset = 'year' | 'month' | 'quarter' | 'custom'

function presetRange(preset: Preset): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const today = iso(now)
  switch (preset) {
    case 'year':
      return { from: `${y}-01-01`, to: today }
    case 'month':
      return { from: iso(new Date(y, now.getMonth(), 1)), to: today }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3) * 3
      return { from: iso(new Date(y, q, 1)), to: today }
    }
    default:
      return { from: '', to: '' }
  }
}

interface Props {
  value: DisposalFilterValue
  onApply: (v: DisposalFilterValue) => void
  onReset: () => void
}

const selectCls =
  'h-9 w-full appearance-none rounded-md border border-border bg-white px-2 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
const dateCls =
  'h-9 w-full rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

export function DisposalFilterPopover({ value, onApply, onReset }: Props) {
  const [draft, setDraft] = useState<DisposalFilterValue>(value)
  const [preset, setPreset] = useState<Preset>(value.from || value.to ? 'custom' : 'year')

  useEffect(() => setDraft(value), [value])

  const activeCount = value.from || value.to ? 1 : 0

  return (
    <Popover
      align="left"
      className="w-[480px] max-w-[92vw]"
      trigger={({ open, toggle }) => (
        <Button variant="outline" size="sm" onClick={toggle} aria-expanded={open}>
          <FilterIcon size={16} /> Lọc
          {activeCount > 0 && (
            <span className="ml-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-white">
              {activeCount}
            </span>
          )}
          <ChevronDownIcon size={14} />
        </Button>
      )}
    >
      {(close) => (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Thời gian">
              <SelectWrap>
                <select
                  value={preset}
                  onChange={(e) => {
                    const p = e.target.value as Preset
                    setPreset(p)
                    if (p !== 'custom') setDraft({ ...draft, ...presetRange(p) })
                  }}
                  className={selectCls}
                >
                  <option value="year">Đầu năm đến hiện tại</option>
                  <option value="month">Tháng này</option>
                  <option value="quarter">Quý này</option>
                  <option value="custom">Tùy chọn</option>
                </select>
              </SelectWrap>
            </Field>
            <Field label="Từ ngày">
              <input
                type="date"
                value={draft.from}
                max={draft.to || undefined}
                onChange={(e) => {
                  setDraft({ ...draft, from: e.target.value })
                  setPreset('custom')
                }}
                className={dateCls}
              />
            </Field>
            <Field label="Đến ngày">
              <input
                type="date"
                value={draft.to}
                min={draft.from || undefined}
                onChange={(e) => {
                  setDraft({ ...draft, to: e.target.value })
                  setPreset('custom')
                }}
                className={dateCls}
              />
            </Field>
          </div>

          <div className="mt-1 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(EMPTY)
                setPreset('year')
                onReset()
                close()
              }}
            >
              Đặt lại
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onApply(draft)
                close()
              }}
            >
              Lọc
            </Button>
          </div>
        </div>
      )}
    </Popover>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      {children}
    </div>
  )
}

function SelectWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDownIcon
        size={14}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  )
}
