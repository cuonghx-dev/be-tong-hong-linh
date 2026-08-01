import { ACCOUNT_NATURE_LABELS, AccountNature, type CreateAccountInput } from '@app/shared'
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
import { Input } from '@/shared/ui/input'
import { Field } from '@/shared/ui/field'
import { CheckboxField } from '@/shared/ui/checkbox-field'
import { Textarea } from '@/shared/ui/textarea'
import { useAccount, useAccounts } from '../api/useAccounts'
import { useCreateAccount, useUpdateAccount } from '../api/useAccountMutations'
import { accountSchema, type AccountFormValues } from '../schema'

interface Props {
  itemId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: AccountFormValues = {
  number: '',
  name: '',
  nature: AccountNature.Debit,
  parentId: '',
  isActive: true,
}

export function AccountForm({ itemId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useAccount(itemId ?? null)
  const create = useCreateAccount()
  const update = useUpdateAccount()
  // Danh sách chọn tài khoản cha (lấy 1 trang lớn — hệ thống TK gốc chỉ vài trăm dòng).
  const all = useAccounts({ page: 1, pageSize: 500 })

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

  const { register,
    control, handleSubmit, reset, watch, setValue, formState } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    const i = editing.data
    if (!i) return
    reset({
      number: i.number,
      name: i.name,
      nature: i.nature,
      nameEn: i.nameEn ?? undefined,
      description: i.description ?? undefined,
      parentId: i.parentId ?? '',
      isActive: i.isActive,
    })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreateAccountInput = values
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
          <Field label="Số tài khoản" required error={formState.errors.number?.message}>
            <Input {...register('number')} placeholder="VD: 1111" />
          </Field>
          <Field label="Tính chất" required error={formState.errors.nature?.message}>
            <Select
              value={watch('nature')}
              onValueChange={(v) => setValue('nature', v as AccountNature)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(AccountNature).map((n) => (
                  <SelectItem key={n} value={n}>
                    {ACCOUNT_NATURE_LABELS[n]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Tên tài khoản" required error={formState.errors.name?.message}>
          <Input {...register('name')} />
        </Field>
        <Field label="Tên tiếng Anh">
          <Input {...register('nameEn')} />
        </Field>
        <Field label="Thuộc tài khoản">
          <Select
            value={watch('parentId') || 'root'}
            onValueChange={(v) => setValue('parentId', v === 'root' ? '' : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="root">— Tài khoản gốc —</SelectItem>
              {parentOptions.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.number} — {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
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
