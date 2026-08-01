import type { CreateDefaultAccountInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { AccountPicker } from '@/shared/ui/account-picker'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Field } from '@/shared/ui/field'
import { CheckboxField } from '@/shared/ui/checkbox-field'
import { useDefaultAccount } from '../api/useDefaultAccounts'
import {
  useCreateDefaultAccount,
  useUpdateDefaultAccount,
} from '../api/useDefaultAccountMutations'
import { defaultAccountSchema, type DefaultAccountFormValues } from '../schema'

interface Props {
  defaultAccountId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: DefaultAccountFormValues = {
  name: '',
  debitAccount: '',
  creditAccount: '',
  isActive: true,
}

export function DefaultAccountForm({ defaultAccountId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useDefaultAccount(defaultAccountId ?? null)
  const create = useCreateDefaultAccount()
  const update = useUpdateDefaultAccount()

  const { control, register, handleSubmit, reset, formState } = useForm<DefaultAccountFormValues>({
    resolver: zodResolver(defaultAccountSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    const d = editing.data
    if (!d) return
    reset({
      name: d.name,
      debitAccount: d.debitAccount ?? '',
      creditAccount: d.creditAccount ?? '',
      isActive: d.isActive,
    })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreateDefaultAccountInput = {
      name: values.name,
      debitAccount: values.debitAccount || null,
      creditAccount: values.creditAccount || null,
      isActive: values.isActive,
    }
    if (defaultAccountId) await update.mutateAsync({ id: defaultAccountId, dto })
    else await create.mutateAsync(dto)
    onSaved()
  })

  const saving = create.isPending || update.isPending
  const error = (create.error ?? update.error) as
    | { response?: { data?: { message?: string } } }
    | null
  const serverMsg = error?.response?.data?.message

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-90">
        <Field label="Loại nghiệp vụ" required error={formState.errors.name?.message}>
          <Input {...register('name')} />
        </Field>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          <Field label="TK Nợ" error={formState.errors.debitAccount?.message}>
            <Controller
              control={control}
              name="debitAccount"
              render={({ field }) => (
                <AccountPicker
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>
          <Field label="TK Có" error={formState.errors.creditAccount?.message}>
            <Controller
              control={control}
              name="creditAccount"
              render={({ field }) => (
                <AccountPicker
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
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
