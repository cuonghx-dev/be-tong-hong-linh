import { InventoryReceiptType } from '@app/shared'
import { useEffect, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { ChevronDownIcon, FilterIcon } from '@/shared/ui/icons'
import { Popover } from '@/shared/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { RECEIPT_TYPE_LABEL } from '../types'

export interface ReceiptFilterValue {
  receiptType: string
  from: string
  to: string
}

const EMPTY: ReceiptFilterValue = { receiptType: '', from: '', to: '' }

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
  value: ReceiptFilterValue
  onApply: (v: ReceiptFilterValue) => void
  onReset: () => void
}

export function ReceiptFilterPopover({ value, onApply, onReset }: Props) {
  const [draft, setDraft] = useState<ReceiptFilterValue>(value)
  const [preset, setPreset] = useState<Preset>(value.from || value.to ? 'custom' : 'year')

  useEffect(() => setDraft(value), [value])

  const activeCount = (value.receiptType ? 1 : 0) + (value.from || value.to ? 1 : 0)

  return (
    <Popover
      align="left"
      className="w-[520px] max-w-[92vw]"
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
          <Field label="Loại chứng từ">
            <Select
              value={draft.receiptType || 'all'}
              onValueChange={(v) => setDraft({ ...draft, receiptType: v === 'all' ? '' : v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {Object.values(InventoryReceiptType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {RECEIPT_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-3 gap-2">
            <Field label="Thời gian">
              <Select
                value={preset}
                onValueChange={(v) => {
                  const p = v as Preset
                  setPreset(p)
                  if (p !== 'custom') setDraft({ ...draft, ...presetRange(p) })
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">Đầu năm đến hiện tại</SelectItem>
                  <SelectItem value="month">Tháng này</SelectItem>
                  <SelectItem value="quarter">Quý này</SelectItem>
                  <SelectItem value="custom">Tùy chọn</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Từ ngày">
              <Input
                type="date"
                value={draft.from}
                max={draft.to || undefined}
                onChange={(e) => {
                  setDraft({ ...draft, from: e.target.value })
                  setPreset('custom')
                }}
              />
            </Field>
            <Field label="Đến ngày">
              <Input
                type="date"
                value={draft.to}
                min={draft.from || undefined}
                onChange={(e) => {
                  setDraft({ ...draft, to: e.target.value })
                  setPreset('custom')
                }}
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
