import { CHART_OF_ACCOUNTS, ReceivableAging, ReceivableStatus } from '@app/shared'
import { useEffect, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { ChevronDownIcon, FilterIcon } from '@/shared/ui/icons'
import { Popover } from '@/shared/ui/popover'
import { PAYABLE_AGING_LABEL, PAYABLE_STATUS_LABEL } from '../types'

export interface PayableFilterValue {
  account: string
  aging: ReceivableAging
  status: ReceivableStatus
  toDate: string
}

const today = () => new Date().toISOString().slice(0, 10)

export const emptyPayableFilter = (): PayableFilterValue => ({
  account: '',
  aging: ReceivableAging.All,
  status: ReceivableStatus.All,
  toDate: today(),
})

// TK công nợ phải trả chọn được (dữ liệu hiện chỉ ghi trên 331).
const ACCOUNT_OPTIONS = [{ value: CHART_OF_ACCOUNTS.PAYABLE, label: '331 - Phải trả người bán' }]

interface Props {
  value: PayableFilterValue
  onApply: (v: PayableFilterValue) => void
  onReset: () => void
}

const selectCls =
  'h-9 w-full appearance-none rounded-md border border-border bg-white px-2 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
const dateCls =
  'h-9 w-full rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

export function PayableFilterPopover({ value, onApply, onReset }: Props) {
  const [draft, setDraft] = useState<PayableFilterValue>(value)

  useEffect(() => setDraft(value), [value])

  const activeCount =
    (value.account ? 1 : 0) +
    (value.aging !== ReceivableAging.All ? 1 : 0) +
    (value.status !== ReceivableStatus.All ? 1 : 0)

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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tài khoản">
              <SelectWrap>
                <select
                  value={draft.account}
                  onChange={(e) => setDraft({ ...draft, account: e.target.value })}
                  className={selectCls}
                >
                  <option value="">Tất cả</option>
                  {ACCOUNT_OPTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </SelectWrap>
            </Field>

            <Field label="Phân tích theo tuổi nợ">
              <SelectWrap>
                <select
                  value={draft.aging}
                  onChange={(e) => setDraft({ ...draft, aging: e.target.value as ReceivableAging })}
                  className={selectCls}
                >
                  {Object.values(ReceivableAging).map((a) => (
                    <option key={a} value={a}>
                      {PAYABLE_AGING_LABEL[a]}
                    </option>
                  ))}
                </select>
              </SelectWrap>
            </Field>

            <Field label="Tình trạng nợ">
              <SelectWrap>
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.value as ReceivableStatus })
                  }
                  className={selectCls}
                >
                  {Object.values(ReceivableStatus).map((s) => (
                    <option key={s} value={s}>
                      {PAYABLE_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </SelectWrap>
            </Field>

            <Field label="Đến ngày">
              <input
                type="date"
                value={draft.toDate}
                onChange={(e) => setDraft({ ...draft, toDate: e.target.value })}
                className={dateCls}
              />
            </Field>
          </div>

          <div className="mt-1 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(emptyPayableFilter())
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
