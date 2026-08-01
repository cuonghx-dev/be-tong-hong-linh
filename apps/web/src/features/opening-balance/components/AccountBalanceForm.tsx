import { useState } from 'react'
import { formatCurrency } from '@/shared/lib/currency'
import { AmountInput } from '@/shared/ui/amount-input'
import { Input } from '@/shared/ui/input'
import { Field } from '@/shared/ui/field'
import { Button } from '@/shared/ui/button'

// Giá trị 1 dòng số dư đang soạn trong form.
export interface BalanceFormValue {
  accountCode: string
  accountName: string
  debitAmount: number
  creditAmount: number
}

interface Props {
  initial?: BalanceFormValue
  // TK cha: Dư Nợ/Dư Có readonly vì tự cộng dồn từ con (rollup).
  isParent?: boolean
  // Các số TK đã tồn tại (trừ chính dòng đang sửa) — chặn trùng.
  existingCodes: string[]
  onSubmit: (value: BalanceFormValue) => void
  onCancel: () => void
}

const EMPTY: BalanceFormValue = {
  accountCode: '',
  accountName: '',
  debitAmount: 0,
  creditAmount: 0,
}

// Form 1 dòng số dư tài khoản đầu kỳ (mở trong Modal, gọi từ AccountBalancePage).
export function AccountBalanceForm({ initial, isParent, existingCodes, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState<BalanceFormValue>(initial ?? EMPTY)
  const [error, setError] = useState<string | null>(null)

  const patch = (p: Partial<BalanceFormValue>) => setValue((v) => ({ ...v, ...p }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = value.accountCode.trim()
    if (!code) return setError('Nhập số tài khoản.')
    if (existingCodes.includes(code)) return setError(`Số tài khoản ${code} đã tồn tại.`)
    setError(null)
    onSubmit({
      accountCode: code,
      accountName: value.accountName.trim(),
      debitAmount: value.debitAmount,
      creditAmount: value.creditAmount,
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Số tài khoản" required>
          <Input
            value={value.accountCode}
            onChange={(e) => patch({ accountCode: e.target.value })}
            placeholder="vd 1111"
            className="tabular-nums"
            autoFocus
          />
        </Field>
        <Field label="Tên tài khoản" className="sm:col-span-2">
          <Input
            value={value.accountName}
            onChange={(e) => patch({ accountName: e.target.value })}
            placeholder="Tên tài khoản"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Dư Nợ">
          {isParent ? (
            <div className="flex h-9 w-full items-center justify-end rounded-md border border-border bg-slate-50 px-3 text-sm tabular-nums text-slate-500">
              {formatCurrency(value.debitAmount)}
            </div>
          ) : (
            <AmountInput value={value.debitAmount} onChange={(v) => patch({ debitAmount: v })} />
          )}
        </Field>
        <Field label="Dư Có">
          {isParent ? (
            <div className="flex h-9 w-full items-center justify-end rounded-md border border-border bg-slate-50 px-3 text-sm tabular-nums text-slate-500">
              {formatCurrency(value.creditAmount)}
            </div>
          ) : (
            <AmountInput value={value.creditAmount} onChange={(v) => patch({ creditAmount: v })} />
          )}
        </Field>
      </div>

      {isParent && (
        <p className="text-xs text-slate-400">
          Số dư tài khoản tổng hợp được cộng dồn tự động từ các tài khoản con.
        </p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="mt-2 flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit">Lưu</Button>
      </div>
    </form>
  )
}
