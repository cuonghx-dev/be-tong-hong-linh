import { type CreateVoucherTypeInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/shared/ui/button'
import { useVoucherType } from '../api/useVoucherTypes'
import { useCreateVoucherType, useUpdateVoucherType } from '../api/useVoucherTypeMutations'
import { voucherTypeSchema, type VoucherTypeFormValues } from '../schema'

interface Props {
  voucherTypeId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: VoucherTypeFormValues = {
  code: '',
  name: '',
  isActive: true,
}

export function VoucherTypeForm({ voucherTypeId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useVoucherType(voucherTypeId ?? null)
  const create = useCreateVoucherType()
  const update = useUpdateVoucherType()

  const { register, handleSubmit, reset, formState } = useForm<VoucherTypeFormValues>({
    resolver: zodResolver(voucherTypeSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    const t = editing.data
    if (!t) return
    reset({ code: t.code, name: t.name, isActive: t.isActive })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreateVoucherTypeInput = values
    if (voucherTypeId) await update.mutateAsync({ id: voucherTypeId, dto })
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
          <Field label="Mã loại chứng từ" required error={formState.errors.code?.message}>
            <input {...register('code')} className={inputCls} />
          </Field>
          <Field label="Tên loại chứng từ" required error={formState.errors.name?.message}>
            <input {...register('name')} className={inputCls} />
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
              {saving ? 'Đang cất…' : 'Cất'}
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
