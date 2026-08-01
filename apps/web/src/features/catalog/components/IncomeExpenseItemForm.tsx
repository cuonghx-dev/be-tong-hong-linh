import {
  INCOME_EXPENSE_TYPE_LABELS,
  IncomeExpenseType,
  type CreateIncomeExpenseItemInput,
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
import {
  useCreateIncomeExpenseItem,
  useUpdateIncomeExpenseItem,
} from '../api/useIncomeExpenseItemMutations'
import { useIncomeExpenseItem } from '../api/useIncomeExpenseItems'
import { incomeExpenseItemSchema, type IncomeExpenseItemFormValues } from '../schema'

interface Props {
  itemId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: IncomeExpenseItemFormValues = {
  code: '',
  name: '',
  type: IncomeExpenseType.Income,
  recurring: false,
  isActive: true,
}

export function IncomeExpenseItemForm({ itemId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useIncomeExpenseItem(itemId ?? null)
  const create = useCreateIncomeExpenseItem()
  const update = useUpdateIncomeExpenseItem()

  const { register,
    control, handleSubmit, reset, watch, setValue, formState } = useForm<IncomeExpenseItemFormValues>({
    resolver: zodResolver(incomeExpenseItemSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    const c = editing.data
    if (!c) return
    reset({
      code: c.code,
      name: c.name,
      type: c.type,
      recurring: c.recurring,
      isActive: c.isActive,
    })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreateIncomeExpenseItemInput = values
    if (itemId) await update.mutateAsync({ id: itemId, dto })
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
          <Field label="Mã mục thu/chi" required error={formState.errors.code?.message}>
            <Input {...register('code')} />
          </Field>
          <Field label="Tên mục thu/chi" required error={formState.errors.name?.message}>
            <Input {...register('name')} />
          </Field>
          <Field label="Loại" required error={formState.errors.type?.message}>
            <Select
              value={watch('type')}
              onValueChange={(v) => setValue('type', v as IncomeExpenseType)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(IncomeExpenseType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {INCOME_EXPENSE_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <CheckboxField control={control} name="recurring" label="Phát sinh định kỳ" />

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
