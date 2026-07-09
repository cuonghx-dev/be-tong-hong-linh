import { FixedAssetStatus } from '@app/shared'
import { useEffect, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { ChevronDownIcon, FilterIcon } from '@/shared/ui/icons'
import { Popover } from '@/shared/ui/popover'
import { ASSET_TYPE_OPTIONS, FIXED_ASSET_STATUS_LABEL } from '../types'

export interface FixedAssetFilterValue {
  assetType: string
  status: string
  from: string
  to: string
}

const EMPTY: FixedAssetFilterValue = { assetType: '', status: '', from: '', to: '' }

interface Props {
  value: FixedAssetFilterValue
  onApply: (v: FixedAssetFilterValue) => void
  onReset: () => void
}

const selectCls =
  'h-9 w-full appearance-none rounded-md border border-border bg-white px-2 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
const dateCls =
  'h-9 w-full rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

export function FixedAssetFilterPopover({ value, onApply, onReset }: Props) {
  const [draft, setDraft] = useState<FixedAssetFilterValue>(value)

  useEffect(() => setDraft(value), [value])

  const activeCount =
    (value.assetType ? 1 : 0) + (value.status ? 1 : 0) + (value.from || value.to ? 1 : 0)

  return (
    <Popover
      align="left"
      className="w-[560px] max-w-[92vw]"
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
          <div className="grid grid-cols-2 gap-2">
            <Field label="Loại tài sản">
              <SelectWrap>
                <select
                  value={draft.assetType}
                  onChange={(e) => setDraft({ ...draft, assetType: e.target.value })}
                  className={selectCls}
                >
                  <option value="">Tất cả</option>
                  {ASSET_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </SelectWrap>
            </Field>
            <Field label="Tình trạng sử dụng">
              <SelectWrap>
                <select
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                  className={selectCls}
                >
                  <option value="">Tất cả</option>
                  {Object.values(FixedAssetStatus).map((s) => (
                    <option key={s} value={s}>
                      {FIXED_ASSET_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </SelectWrap>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Ngày ghi tăng từ">
              <input
                type="date"
                value={draft.from}
                max={draft.to || undefined}
                onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                className={dateCls}
              />
            </Field>
            <Field label="Đến ngày">
              <input
                type="date"
                value={draft.to}
                min={draft.from || undefined}
                onChange={(e) => setDraft({ ...draft, to: e.target.value })}
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
