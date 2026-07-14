import { TRANSFER_SIDE_LABELS, TransferSide, type CreateTransferAccountInput } from '@app/shared'
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

  const { register, handleSubmit, reset, watch, setValue, formState } = useForm<TransferAccountFormValues>({
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
            <input type="number" {...register('order')} className={inputCls} />
          </Field>
          <Field label="Mã kết chuyển" required error={formState.errors.code?.message}>
            <input {...register('code')} className={inputCls} />
          </Field>
          <Field label="Kết chuyển từ" required error={formState.errors.fromAccount?.message}>
            <input {...register('fromAccount')} className={inputCls} />
          </Field>
          <Field label="Kết chuyển đến" required error={formState.errors.toAccount?.message}>
            <input {...register('toAccount')} className={inputCls} />
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
          <textarea {...register('description')} rows={2} className={textareaCls} />
        </Field>

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
const textareaCls =
  'w-full rounded-md border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

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
