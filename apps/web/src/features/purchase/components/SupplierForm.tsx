import { SupplierType, type CreateSupplierInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useEmployees, usePartnerGroups } from '@/features/catalog'
import { Button } from '@/shared/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Input } from '@/shared/ui/input'
import { Field } from '@/shared/ui/field'
import { CheckboxField } from '@/shared/ui/checkbox-field'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'
import { Label } from '@/shared/ui/label'
import { useSupplier } from '../api/useSuppliers'
import { useCreateSupplier, useUpdateSupplier } from '../api/useSupplierMutations'
import { supplierSchema, type SupplierFormValues } from '../schema'
import { SUPPLIER_TYPE_LABEL } from '../types'

interface Props {
  supplierId?: string | null
  // Nhân bản: điền sẵn dữ liệu từ NCC nguồn, để trống mã (mã phải duy nhất), Lưu tạo bản ghi mới.
  duplicateFromId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: SupplierFormValues = {
  code: '',
  name: '',
  type: SupplierType.Organization,
  isCustomer: false,
  isInternal: false,
}

export function SupplierForm({
  supplierId,
  duplicateFromId,
  readOnly = false,
  onSaved,
  onCancel,
}: Props) {
  const duplicating = !supplierId && !!duplicateFromId
  const editing = useSupplier(supplierId ?? duplicateFromId ?? null)
  const create = useCreateSupplier()
  const update = useUpdateSupplier()
  // Nguồn cho combobox nhóm NCC + nhân viên (chỉ bản ghi đang sử dụng).
  const groups = usePartnerGroups({ page: 1, pageSize: 200, isActive: true })
  const employees = useEmployees({ page: 1, pageSize: 200, isActive: true })

  const { register, control, handleSubmit, reset, formState } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    const s = editing.data
    if (!s) return
    reset({
      // Nhân bản → mã để trống cho người dùng tự nhập (mã duy nhất).
      code: duplicating ? '' : s.code,
      name: s.name,
      type: s.type,
      isCustomer: s.isCustomer,
      taxCode: s.taxCode ?? undefined,
      budgetRelationCode: s.budgetRelationCode ?? undefined,
      phone: s.phone ?? undefined,
      website: s.website ?? undefined,
      address: s.address ?? undefined,
      groupId: s.groupId ?? undefined,
      employeeId: s.employeeId ?? undefined,
      isInternal: s.isInternal,
      invoiceRisk: s.invoiceRisk ?? undefined,
    })
  }, [editing.data, reset, duplicating])

  const submit = handleSubmit(async (values) => {
    // Combobox để trống trả '' → gửi undefined để không set khóa ngoại rỗng.
    const dto: CreateSupplierInput = {
      ...values,
      groupId: values.groupId || undefined,
      employeeId: values.employeeId || undefined,
    }
    if (supplierId) await update.mutateAsync({ id: supplierId, dto })
    else await create.mutateAsync(dto)
    onSaved()
  })

  const saving = create.isPending || update.isPending
  const error = (create.error ?? update.error) as { response?: { data?: { message?: string } } } | null
  const serverMsg = error?.response?.data?.message

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-90">
      <div className="flex gap-4">
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
              {Object.values(SupplierType).map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <RadioGroupItem value={t} id={`supplier-type-${t}`} />
                  <Label htmlFor={`supplier-type-${t}`} className="cursor-pointer font-normal">
                    {SUPPLIER_TYPE_LABEL[t]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        />
        <CheckboxField control={control} name="isCustomer" label="Là khách hàng" className="ml-auto" />
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
        <Field label="Mã nhà cung cấp" required error={formState.errors.code?.message}>
          <Input {...register('code')} />
        </Field>
        <Field label="Tên nhà cung cấp" required error={formState.errors.name?.message}>
          <Input {...register('name')} />
        </Field>
        <Field label="Mã số thuế/CCCD">
          <Input {...register('taxCode')} />
        </Field>
        <Field label="Mã số ĐVQHNS">
          <Input {...register('budgetRelationCode')} />
        </Field>
        <Field label="Điện thoại">
          <Input {...register('phone')} />
        </Field>
        <Field label="Website">
          <Input {...register('website')} />
        </Field>
        <Field label="Địa chỉ">
          <Input {...register('address')} />
        </Field>
        <Field label="Nhóm nhà cung cấp">
          <Controller
            control={control}
            name="groupId"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Chọn nhóm nhà cung cấp --" />
                </SelectTrigger>
                <SelectContent>
                  {(groups.data?.data ?? []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.code} - {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Nhân viên mua hàng">
          <Controller
            control={control}
            name="employeeId"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Chọn nhân viên --" />
                </SelectTrigger>
                <SelectContent>
                  {(employees.data?.data ?? []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.code} - {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Rủi ro về hóa đơn">
          <Input {...register('invoiceRisk')} />
        </Field>
      </div>

      <CheckboxField control={control} name="isInternal" label="Là đối tượng nội bộ" />

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
