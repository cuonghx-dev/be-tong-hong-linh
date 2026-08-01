import { CHART_OF_ACCOUNTS, ReceivableAging, ReceivableStatus } from '@app/shared'
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
import { RECEIVABLE_AGING_LABEL, RECEIVABLE_STATUS_LABEL } from '../types'
import { Badge } from '@/shared/ui/badge'

export interface ReceivableFilterValue {
  account: string
  aging: ReceivableAging
  status: ReceivableStatus
  toDate: string
}

const today = () => new Date().toISOString().slice(0, 10)

export const emptyReceivableFilter = (): ReceivableFilterValue => ({
  account: '',
  aging: ReceivableAging.All,
  status: ReceivableStatus.All,
  toDate: today(),
})

// TK công nợ phải thu chọn được (dữ liệu hiện chỉ ghi trên 131 — §7).
const ACCOUNT_OPTIONS = [{ value: CHART_OF_ACCOUNTS.RECEIVABLE, label: '131 - Phải thu khách hàng' }]

interface Props {
  value: ReceivableFilterValue
  onApply: (v: ReceivableFilterValue) => void
  onReset: () => void
}

export function ReceivableFilterPopover({ value, onApply, onReset }: Props) {
  const [draft, setDraft] = useState<ReceivableFilterValue>(value)

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
            <Badge variant="count">
              {activeCount}
            </Badge>
          )}
          <ChevronDownIcon size={14} />
        </Button>
      )}
    >
      {(close) => (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tài khoản">
              <Select
                value={draft.account || 'all'}
                onValueChange={(v) => setDraft({ ...draft, account: v === 'all' ? '' : v })}
              >
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {ACCOUNT_OPTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Phân tích theo tuổi nợ">
              <Select
                value={draft.aging}
                onValueChange={(v) => setDraft({ ...draft, aging: v as ReceivableAging })}
              >
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ReceivableAging).map((a) => (
                    <SelectItem key={a} value={a}>
                      {RECEIVABLE_AGING_LABEL[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Tình trạng nợ">
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft({ ...draft, status: v as ReceivableStatus })}
              >
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ReceivableStatus).map((s) => (
                    <SelectItem key={s} value={s}>
                      {RECEIVABLE_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Đến ngày">
              <Input
                type="date"
                value={draft.toDate}
                onChange={(e) => setDraft({ ...draft, toDate: e.target.value })}
              />
            </Field>
          </div>

          <div className="mt-1 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(emptyReceivableFilter())
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

