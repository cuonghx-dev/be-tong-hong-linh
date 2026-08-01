import type { CreateBankInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Field } from '@/shared/ui/field'
import { CheckboxField } from '@/shared/ui/checkbox-field'
import { useBank } from '../api/useBanks'
import { useCreateBank, useUpdateBank } from '../api/useBankMutations'
import { bankSchema, type BankFormValues } from '../schema'

interface Props {
  bankId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: BankFormValues = {
  shortName: '',
  fullName: '',
  isActive: true,
}

export function BankForm({ bankId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useBank(bankId ?? null)
  const create = useCreateBank()
  const update = useUpdateBank()

  const { register,
    control, handleSubmit, reset, formState } = useForm<BankFormValues>({
    resolver: zodResolver(bankSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    const b = editing.data
    if (!b) return
    reset({
      shortName: b.shortName,
      fullName: b.fullName,
      isActive: b.isActive,
    })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreateBankInput = values
    if (bankId) await update.mutateAsync({ id: bankId, dto })
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
          <Field label="Tên viết tắt" required error={formState.errors.shortName?.message}>
            <Input {...register('shortName')} />
          </Field>
          <Field label="Tên đầy đủ" required error={formState.errors.fullName?.message}>
            <Input {...register('fullName')} />
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
