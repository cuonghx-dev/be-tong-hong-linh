import type { CreateProductGroupInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Field } from '@/shared/ui/field'
import { CheckboxField } from '@/shared/ui/checkbox-field'
import { useProductGroup } from '../api/useProductGroups'
import { useCreateProductGroup, useUpdateProductGroup } from '../api/useProductGroupMutations'
import { productGroupSchema, type ProductGroupFormValues } from '../schema'

interface Props {
  groupId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: ProductGroupFormValues = {
  code: '',
  name: '',
  isActive: true,
}

export function ProductGroupForm({ groupId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useProductGroup(groupId ?? null)
  const create = useCreateProductGroup()
  const update = useUpdateProductGroup()

  const { register,
    control, handleSubmit, reset, formState } = useForm<ProductGroupFormValues>({
    resolver: zodResolver(productGroupSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    const g = editing.data
    if (!g) return
    reset({
      code: g.code,
      name: g.name,
      isActive: g.isActive,
    })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreateProductGroupInput = values
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
          <Field label="Mã nhóm vật tư, hàng hóa, dịch vụ" required error={formState.errors.code?.message}>
            <Input {...register('code')} />
          </Field>
          <Field
            label="Tên nhóm vật tư, hàng hóa, dịch vụ"
            required
            error={formState.errors.name?.message}
          >
            <Input {...register('name')} />
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
