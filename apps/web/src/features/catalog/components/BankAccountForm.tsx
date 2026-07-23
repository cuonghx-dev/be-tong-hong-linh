import type { CreateBankAccountInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useBankAccount } from '../api/useBankAccounts'
import { useCreateBankAccount, useUpdateBankAccount } from '../api/useBankAccountMutations'
import { useBanks } from '../api/useBanks'
import { bankAccountSchema, type BankAccountFormValues } from '../schema'

interface Props {
  accountId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: BankAccountFormValues = {
  accountNumber: '',
  bankName: '',
  isActive: true,
}

export function BankAccountForm({ accountId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useBankAccount(accountId ?? null)
  const create = useCreateBankAccount()
  const update = useUpdateBankAccount()

  // Danh mục ngân hàng đang sử dụng cho dropdown chọn ngân hàng.
  const banks = useBanks({ page: 1, pageSize: 200, isActive: true })

  const { register, handleSubmit, reset, watch, setValue, formState } =
    useForm<BankAccountFormValues>({
      resolver: zodResolver(bankAccountSchema),
      defaultValues: DEFAULTS,
    })

  useEffect(() => {
    const a = editing.data
    if (!a) return
    reset({
      accountNumber: a.accountNumber,
      bankName: a.bankName,
      bankBranch: a.bankBranch ?? undefined,
      accountHolder: a.accountHolder ?? undefined,
      branch: a.branch ?? undefined,
      isActive: a.isActive,
    })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreateBankAccountInput = values
    if (accountId) await update.mutateAsync({ id: accountId, dto })
    else await create.mutateAsync(dto)
    onSaved()
  })

  const saving = create.isPending || update.isPending
  const error = (create.error ?? update.error) as { response?: { data?: { message?: string } } } | null
  const serverMsg = error?.response?.data?.message

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-90">
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          <Field label="Số tài khoản" required error={formState.errors.accountNumber?.message}>
            <input {...register('accountNumber')} className={inputCls} />
          </Field>
          <Field label="Tên ngân hàng" required error={formState.errors.bankName?.message}>
            <Select
              value={watch('bankName') || undefined}
              onValueChange={(v) => setValue('bankName', v, { shouldValidate: true })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Chọn ngân hàng" />
              </SelectTrigger>
              <SelectContent>
                {/* Giá trị cũ không còn trong danh mục (ngừng sử dụng / nhập tay) vẫn hiển thị được. */}
                {watch('bankName') &&
                  !banks.data?.data.some((b) => b.shortName === watch('bankName')) && (
                    <SelectItem value={watch('bankName')}>{watch('bankName')}</SelectItem>
                  )}
                {banks.data?.data.map((b) => (
                  <SelectItem key={b.id} value={b.shortName}>
                    {b.shortName} - {b.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tên chi nhánh ngân hàng">
            <input {...register('bankBranch')} className={inputCls} />
          </Field>
          <Field label="Chủ tài khoản">
            <input {...register('accountHolder')} className={inputCls} />
          </Field>
          <Field label="Chi nhánh">
            <input {...register('branch')} className={inputCls} />
          </Field>
        </div>

        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" {...register('isActive')} />
          Đang sử dụng
        </label>

        {serverMsg && <p className="text-sm text-red-600">{String(serverMsg)}</p>}
      </fieldset>

      <div className="flex justify-end gap-2">
        {readOnly ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Đóng
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </>
        )}
      </div>
    </form>
  )
}

const inputCls =
  'h-9 w-full rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
