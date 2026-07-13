import type { CreateExpenseItemInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useExpenseItem, useExpenseItems } from '../api/useExpenseItems'
import { useCreateExpenseItem, useUpdateExpenseItem } from '../api/useExpenseItemMutations'
import { expenseItemSchema, type ExpenseItemFormValues } from '../schema'

interface Props {
  itemId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: ExpenseItemFormValues = {
  code: '',
  name: '',
  parentId: '',
  isActive: true,
}

export function ExpenseItemForm({ itemId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useExpenseItem(itemId ?? null)
  const create = useCreateExpenseItem()
  const update = useUpdateExpenseItem()
  // Danh sách chọn khoản mục cha (danh mục nhỏ nên lấy 1 trang lớn).
  const all = useExpenseItems({ page: 1, pageSize: 200 })

  // Không cho chọn chính nó hoặc con cháu của nó làm cha (tạo vòng lặp).
  const parentOptions = useMemo(() => {
    const items = all.data?.data ?? []
    if (!itemId) return items
    const childrenByParent = new Map<string, string[]>()
    for (const i of items) {
      if (!i.parentId) continue
      childrenByParent.set(i.parentId, [...(childrenByParent.get(i.parentId) ?? []), i.id])
    }
    const excluded = new Set<string>()
    const walk = (id: string) => {
      excluded.add(id)
      for (const child of childrenByParent.get(id) ?? []) walk(child)
    }
    walk(itemId)
    return items.filter((i) => !excluded.has(i.id))
  }, [all.data, itemId])

  const { register, handleSubmit, reset, watch, setValue, formState } = useForm<ExpenseItemFormValues>({
    resolver: zodResolver(expenseItemSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    const i = editing.data
    if (!i) return
    reset({
      code: i.code,
      name: i.name,
      description: i.description ?? undefined,
      parentId: i.parentId ?? '',
      isActive: i.isActive,
    })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreateExpenseItemInput = values
    if (itemId) await update.mutateAsync({ id: itemId, dto })
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
          <Field label="Mã khoản mục chi phí" required error={formState.errors.code?.message}>
            <input {...register('code')} className={inputCls} placeholder="VD: MTC.VL" />
          </Field>
          <Field label="Tên khoản mục chi phí" required error={formState.errors.name?.message}>
            <input {...register('name')} className={inputCls} />
          </Field>
        </div>
        <Field label="Thuộc khoản mục">
          <Select
            value={watch('parentId') || 'root'}
            onValueChange={(v) => setValue('parentId', v === 'root' ? '' : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="root">— Khoản mục gốc —</SelectItem>
              {parentOptions.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.code} — {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
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
