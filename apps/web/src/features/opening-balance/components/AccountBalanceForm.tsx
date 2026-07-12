import { useState } from 'react'
import { formatCurrency } from '@/shared/lib/currency'
import { AmountInput } from './AmountInput'

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

  const label = 'mb-1 block text-sm font-medium text-slate-600'
  const field =
    'h-9 w-full rounded-md border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>
            Số tài khoản <span className="text-red-500">*</span>
          </label>
          <input
            value={value.accountCode}
            onChange={(e) => patch({ accountCode: e.target.value })}
            placeholder="vd 1111"
            className={`${field} tabular-nums`}
            autoFocus
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Tên tài khoản</label>
          <input
            value={value.accountName}
            onChange={(e) => patch({ accountName: e.target.value })}
            placeholder="Tên tài khoản"
            className={field}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Dư Nợ</label>
          {isParent ? (
            <div className={`${field} flex items-center justify-end bg-slate-50 tabular-nums text-slate-500`}>
              {formatCurrency(value.debitAmount)}
            </div>
          ) : (
            <AmountInput value={value.debitAmount} onChange={(v) => patch({ debitAmount: v })} />
          )}
        </div>
        <div>
          <label className={label}>Dư Có</label>
          {isParent ? (
            <div className={`${field} flex items-center justify-end bg-slate-50 tabular-nums text-slate-500`}>
              {formatCurrency(value.creditAmount)}
            </div>
          ) : (
            <AmountInput value={value.creditAmount} onChange={(v) => patch({ creditAmount: v })} />
          )}
        </div>
      </div>

      {isParent && (
        <p className="text-xs text-slate-400">
          Số dư tài khoản tổng hợp được cộng dồn tự động từ các tài khoản con.
        </p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-md border border-border px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
        >
          Cất
        </button>
      </div>
    </form>
  )
}
