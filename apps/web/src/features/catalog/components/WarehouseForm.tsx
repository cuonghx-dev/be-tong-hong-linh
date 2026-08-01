import type { CreateWarehouseInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Field } from '@/shared/ui/field'
import { CheckboxField } from '@/shared/ui/checkbox-field'
import { useWarehouse } from '../api/useWarehouses'
import { useCreateWarehouse, useUpdateWarehouse } from '../api/useWarehouseMutations'
import { warehouseSchema, type WarehouseFormValues } from '../schema'

interface Props {
  warehouseId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: WarehouseFormValues = {
  code: '',
  name: '',
  isActive: true,
}

export function WarehouseForm({ warehouseId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useWarehouse(warehouseId ?? null)
  const create = useCreateWarehouse()
  const update = useUpdateWarehouse()

  const { register,
    control, handleSubmit, reset, formState } = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    const w = editing.data
    if (!w) return
    reset({
      code: w.code,
      name: w.name,
      address: w.address ?? undefined,
      branch: w.branch ?? undefined,
      isActive: w.isActive,
    })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreateWarehouseInput = values
    if (warehouseId) await update.mutateAsync({ id: warehouseId, dto })
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
          <Field label="Mã kho" required error={formState.errors.code?.message}>
            <Input {...register('code')} />
          </Field>
          <Field label="Tên kho" required error={formState.errors.name?.message}>
            <Input {...register('name')} />
          </Field>
          <Field label="Địa chỉ">
            <Input {...register('address')} />
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
