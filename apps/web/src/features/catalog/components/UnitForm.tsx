import { type CreateUnitInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/shared/ui/button'
import { useUnit } from '../api/useUnits'
import { useCreateUnit, useUpdateUnit } from '../api/useUnitMutations'
import { unitSchema, type UnitFormValues } from '../schema'

interface Props {
  unitId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: UnitFormValues = {
  name: '',
  description: '',
  isActive: true,
}

export function UnitForm({ unitId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useUnit(unitId ?? null)
  const create = useCreateUnit()
  const update = useUpdateUnit()

  const { register, handleSubmit, reset, formState } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    const u = editing.data
    if (!u) return
    reset({ name: u.name, description: u.description ?? '', isActive: u.isActive })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreateUnitInput = {
      name: values.name,
      description: values.description?.trim() ? values.description.trim() : null,
      isActive: values.isActive,
    }
    if (unitId) await update.mutateAsync({ id: unitId, dto })
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
          <Field label="Đơn vị tính" required error={formState.errors.name?.message}>
            <input {...register('name')} className={inputCls} />
          </Field>
          <Field label="Mô tả" error={formState.errors.description?.message}>
            <input {...register('description')} className={inputCls} />
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
