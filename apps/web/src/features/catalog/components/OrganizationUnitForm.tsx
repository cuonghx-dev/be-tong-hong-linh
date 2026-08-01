import {
  ORG_UNIT_LEVEL_LABELS,
  OrgUnitLevel,
  type CreateOrganizationUnitInput,
} from '@app/shared'
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
import { useOrganizationUnit, useOrganizationUnits } from '../api/useOrganizationUnits'
import {
  useCreateOrganizationUnit,
  useUpdateOrganizationUnit,
} from '../api/useOrganizationUnitMutations'
import { organizationUnitSchema, type OrganizationUnitFormValues } from '../schema'

interface Props {
  unitId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: OrganizationUnitFormValues = {
  code: '',
  name: '',
  level: OrgUnitLevel.Department,
  parentId: '',
  isActive: true,
}

export function OrganizationUnitForm({ unitId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useOrganizationUnit(unitId ?? null)
  const create = useCreateOrganizationUnit()
  const update = useUpdateOrganizationUnit()
  // Danh sách chọn đơn vị cha (danh mục nhỏ nên lấy 1 trang lớn).
  const all = useOrganizationUnits({ page: 1, pageSize: 200 })

  // Không cho chọn chính nó hoặc đơn vị trực thuộc nó làm cha (tạo vòng lặp).
  const parentOptions = useMemo(() => {
    const units = all.data?.data ?? []
    if (!unitId) return units
    const childrenByParent = new Map<string, string[]>()
    for (const u of units) {
      if (!u.parentId) continue
      childrenByParent.set(u.parentId, [...(childrenByParent.get(u.parentId) ?? []), u.id])
    }
    const excluded = new Set<string>()
    const walk = (id: string) => {
      excluded.add(id)
      for (const child of childrenByParent.get(id) ?? []) walk(child)
    }
    walk(unitId)
    return units.filter((u) => !excluded.has(u.id))
  }, [all.data, unitId])

  const { register, control, handleSubmit, reset, watch, setValue, formState } =
    useForm<OrganizationUnitFormValues>({
      resolver: zodResolver(organizationUnitSchema),
      defaultValues: DEFAULTS,
    })

  useEffect(() => {
    const u = editing.data
    if (!u) return
    reset({
      code: u.code,
      name: u.name,
      address: u.address ?? undefined,
      level: u.level,
      parentId: u.parentId ?? '',
      isActive: u.isActive,
    })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreateOrganizationUnitInput = values
    if (unitId) await update.mutateAsync({ id: unitId, dto })
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
          <Field label="Mã đơn vị" required error={formState.errors.code?.message}>
            <Input {...register('code')} />
          </Field>
          <Field label="Tên đơn vị" required error={formState.errors.name?.message}>
            <Input {...register('name')} />
          </Field>
          <Field label="Cấp tổ chức" required error={formState.errors.level?.message}>
            <Select
              value={watch('level')}
              onValueChange={(v) => setValue('level', v as OrgUnitLevel)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(OrgUnitLevel).map((l) => (
                  <SelectItem key={l} value={l}>
                    {ORG_UNIT_LEVEL_LABELS[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Thuộc đơn vị">
            <Select
              value={watch('parentId') || 'root'}
              onValueChange={(v) => setValue('parentId', v === 'root' ? '' : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">— Đơn vị gốc —</SelectItem>
                {parentOptions.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.code} — {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Địa chỉ">
            <Input {...register('address')} />
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
