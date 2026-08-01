import { TRANSFER_SIDE_LABELS, TransferSide, type CreateTransferAccountInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { AccountPicker } from '@/shared/ui/account-picker'
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
import { Textarea } from '@/shared/ui/textarea'
import { useTransferAccount } from '../api/useTransferAccounts'
import {
  useCreateTransferAccount,
  useUpdateTransferAccount,
} from '../api/useTransferAccountMutations'
import { transferAccountSchema, type TransferAccountFormValues } from '../schema'

interface Props {
  transferAccountId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: TransferAccountFormValues = {
  order: 1,
  code: '',
  fromAccount: '',
  toAccount: '',
  side: TransferSide.Both,
  isActive: true,
}

export function TransferAccountForm({
  transferAccountId,
  readOnly = false,
  onSaved,
  onCancel,
}: Props) {
  const editing = useTransferAccount(transferAccountId ?? null)
  const create = useCreateTransferAccount()
  const update = useUpdateTransferAccount()

  const { control, register, handleSubmit, reset, watch, setValue, formState } = useForm<TransferAccountFormValues>({
    resolver: zodResolver(transferAccountSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    const t = editing.data
    if (!t) return
    reset({
      order: t.order,
      code: t.code,
      fromAccount: t.fromAccount,
      toAccount: t.toAccount,
      side: t.side,
      description: t.description ?? undefined,
      isActive: t.isActive,
    })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreateTransferAccountInput = values
    if (transferAccountId) await update.mutateAsync({ id: transferAccountId, dto })
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
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          <Field label="Thứ tự kết chuyển" required error={formState.errors.order?.message}>
            <Input type="number" {...register('order')} />
          </Field>
          <Field label="Mã kết chuyển" required error={formState.errors.code?.message}>
            <Input {...register('code')} />
          </Field>
          <Field label="Kết chuyển từ" required error={formState.errors.fromAccount?.message}>
            <Controller
              control={control}
              name="fromAccount"
              render={({ field }) => (
                <AccountPicker
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>
          <Field label="Kết chuyển đến" required error={formState.errors.toAccount?.message}>
            <Controller
              control={control}
              name="toAccount"
              render={({ field }) => (
                <AccountPicker
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>
          <Field label="Bên kết chuyển" required error={formState.errors.side?.message}>
            <Select
              value={watch('side')}
              onValueChange={(v) => setValue('side', v as TransferSide)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TransferSide).map((s) => (
                  <SelectItem key={s} value={s}>
                    {TRANSFER_SIDE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Diễn giải">
          <Textarea {...register('description')} rows={2} />
        </Field>

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
