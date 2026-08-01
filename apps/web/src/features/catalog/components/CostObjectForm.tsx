import {
  COST_OBJECT_TYPE_LABELS,
  CostObjectType,
  type CreateCostObjectInput,
} from '@app/shared'
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
import { Textarea } from '@/shared/ui/textarea'
import { useCostObject } from '../api/useCostObjects'
import { useCreateCostObject, useUpdateCostObject } from '../api/useCostObjectMutations'
import { costObjectSchema, type CostObjectFormValues } from '../schema'

interface Props {
  costObjectId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: CostObjectFormValues = {
  code: '',
  name: '',
  type: CostObjectType.Product,
  isActive: true,
}

export function CostObjectForm({ costObjectId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useCostObject(costObjectId ?? null)
  const create = useCreateCostObject()
  const update = useUpdateCostObject()

  const { register,
    control, handleSubmit, reset, watch, setValue, formState } = useForm<CostObjectFormValues>({
    resolver: zodResolver(costObjectSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    const c = editing.data
    if (!c) return
    reset({
      code: c.code,
      name: c.name,
      type: c.type,
      description: c.description ?? undefined,
      isActive: c.isActive,
    })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreateCostObjectInput = values
    if (costObjectId) await update.mutateAsync({ id: costObjectId, dto })
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
          <Field label="Mã đối tượng THCP" required error={formState.errors.code?.message}>
            <Input {...register('code')} />
          </Field>
          <Field label="Tên đối tượng THCP" required error={formState.errors.name?.message}>
            <Input {...register('name')} />
          </Field>
          <Field label="Loại" required error={formState.errors.type?.message}>
            <Select
              value={watch('type')}
              onValueChange={(v) => setValue('type', v as CostObjectType)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(CostObjectType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {COST_OBJECT_TYPE_LABELS[t]}
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
