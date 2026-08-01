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
import { Input } from '@/shared/ui/input'
import { Field } from '@/shared/ui/field'
import { CheckboxField } from '@/shared/ui/checkbox-field'
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

  const { register, control, handleSubmit, reset, watch, setValue, formState } =
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
            <Input {...register('accountNumber')} />
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
            <Input {...register('bankBranch')} />
          </Field>
          <Field label="Chủ tài khoản">
            <Input {...register('accountHolder')} />
          </Field>
          <Field label="Chi nhánh">
            <Input {...register('branch')} />
          </Field>
        </div>

        <CheckboxField control={control} name="isActive" label="Đang sử dụng" />

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
