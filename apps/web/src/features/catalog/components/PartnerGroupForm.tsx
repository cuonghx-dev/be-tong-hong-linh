import type { CreatePartnerGroupInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/shared/ui/button'
import { usePartnerGroup } from '../api/usePartnerGroups'
import { useCreatePartnerGroup, useUpdatePartnerGroup } from '../api/usePartnerGroupMutations'
import { partnerGroupSchema, type PartnerGroupFormValues } from '../schema'

interface Props {
  groupId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: PartnerGroupFormValues = {
  code: '',
  name: '',
  isActive: true,
}

export function PartnerGroupForm({ groupId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = usePartnerGroup(groupId ?? null)
  const create = useCreatePartnerGroup()
  const update = useUpdatePartnerGroup()

  const { register, handleSubmit, reset, formState } = useForm<PartnerGroupFormValues>({
    resolver: zodResolver(partnerGroupSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    const g = editing.data
    if (!g) return
    reset({
      code: g.code,
      name: g.name,
      description: g.description ?? undefined,
      isActive: g.isActive,
    })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreatePartnerGroupInput = values
    if (groupId) await update.mutateAsync({ id: groupId, dto })
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
          <Field label="Mã nhóm KH, NCC" required error={formState.errors.code?.message}>
            <input {...register('code')} className={inputCls} />
          </Field>
          <Field
            label="Tên nhóm khách hàng, nhà cung cấp"
            required
            error={formState.errors.name?.message}
          >
            <input {...register('name')} className={inputCls} />
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
