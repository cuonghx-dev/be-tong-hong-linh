import { CustomerType, type CreateCustomerInput } from '@app/shared'
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
import { useCustomer } from '../api/useCustomers'
import { useCreateCustomer, useUpdateCustomer } from '../api/useCustomerMutations'
import { customerSchema, type CustomerFormValues } from '../schema'
import { CUSTOMER_TYPE_LABEL } from '../types'

interface CustomerFormProps {
  customerId?: string | null
  // Nhân bản: điền sẵn dữ liệu từ KH nguồn, để trống mã (mã phải duy nhất), Lưu tạo bản ghi mới.
  duplicateFromId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

function defaultValues(): CustomerFormValues {
  return { code: '', name: '', type: CustomerType.Organization, isSupplier: false, isInternal: false }
}

export function CustomerForm({
  customerId,
  duplicateFromId,
  readOnly = false,
  onSaved,
  onCancel,
}: CustomerFormProps) {
  const duplicating = !customerId && !!duplicateFromId
  const editing = useCustomer(customerId ?? duplicateFromId ?? null)
  const create = useCreateCustomer()
  const update = useUpdateCustomer()
  // Nguồn cho 2 combobox: nhóm KH,NCC + nhân viên (chỉ lấy bản ghi đang sử dụng).
  const groups = usePartnerGroups({ page: 1, pageSize: 200, isActive: true })
  const employees = useEmployees({ page: 1, pageSize: 200, isActive: true })

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues(),
  })
  const { register, control, handleSubmit, reset, formState } = form

  useEffect(() => {
    const c = editing.data
    if (!c) return
    reset({
      // Nhân bản → mã để trống cho người dùng tự nhập (mã duy nhất).
      code: duplicating ? '' : c.code,
      name: c.name,
      type: c.type,
      isSupplier: c.isSupplier,
      isInternal: c.isInternal,
      taxCode: c.taxCode ?? undefined,
      budgetRelationCode: c.budgetRelationCode ?? undefined,
      phone: c.phone ?? undefined,
      website: c.website ?? undefined,
      address: c.address ?? undefined,
      groupId: c.groupId ?? undefined,
      salesEmployeeId: c.salesEmployeeId ?? undefined,
      contactName: c.contactName ?? undefined,
      contactEmail: c.contactEmail ?? undefined,
      contactPhone: c.contactPhone ?? undefined,
    })
  }, [editing.data, reset, duplicating])

  const submit = (addAnother: boolean) =>
    handleSubmit(async (values) => {
      // Combobox để trống trả '' → gửi undefined để không set khóa ngoại rỗng.
      const dto: CreateCustomerInput = {
        ...values,
        groupId: values.groupId || undefined,
        salesEmployeeId: values.salesEmployeeId || undefined,
      }
      if (customerId) await update.mutateAsync({ id: customerId, dto })
      else await create.mutateAsync(dto)
      if (addAnother && !customerId) reset(defaultValues())
      else onSaved()
    })

  const saving = create.isPending || update.isPending

  return (
    <form className="space-y-4">
      <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-90">
      {/* Loại đối tượng */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="flex flex-wrap items-center gap-x-5 gap-y-2"
            >
              {Object.values(CustomerType).map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <RadioGroupItem value={t} id={`customer-type-${t}`} />
                  <Label htmlFor={`customer-type-${t}`} className="cursor-pointer font-normal">
                    {CUSTOMER_TYPE_LABEL[t]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        />
        <CheckboxField control={control} name="isSupplier" label="Là nhà cung cấp" className="ml-2" />
        <CheckboxField control={control} name="isInternal" label="Là đối tượng nội bộ" />
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
        <Field label="Mã khách hàng *" error={formState.errors.code?.message}>
          <Input {...register('code')} />
        </Field>
        <Field label="Tên khách hàng *" error={formState.errors.name?.message}>
          <Input {...register('name')} />
        </Field>
        <Field label="Mã số thuế / CCCD chủ hộ">
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
        <Field label="Nhóm khách hàng">
          <Controller
            control={control}
            name="groupId"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Chọn nhóm khách hàng --" />
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
        <Field label="Nhân viên bán hàng">
          <Controller
            control={control}
            name="salesEmployeeId"
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
      </div>

      {/* Thông tin liên hệ / nhận HĐĐT */}
      <div className="rounded-md border border-border p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Người nhận hóa đơn điện tử
        </p>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
          <Field label="Họ và tên">
            <Input {...register('contactName')} />
          </Field>
          <Field label="Email (ngăn cách bằng ;)">
            <Input {...register('contactEmail')} />
          </Field>
          <Field label="Số điện thoại">
            <Input {...register('contactPhone')} />
          </Field>
        </div>
      </div>

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
            <Button type="button" onClick={submit(false)} disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu'}
            </Button>
            {!customerId && (
              <Button type="button" variant="secondary" onClick={submit(true)} disabled={saving}>
                Lưu và Thêm
              </Button>
            )}
          </>
        )}
      </div>
    </form>
  )
}
