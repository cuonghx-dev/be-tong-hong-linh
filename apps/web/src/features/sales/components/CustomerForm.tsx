import { CustomerType, type CreateCustomerInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/shared/ui/button'
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

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues(),
  })
  const { register, handleSubmit, reset, formState } = form

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
      const dto: CreateCustomerInput = values
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
        {Object.values(CustomerType).map((t) => (
          <label key={t} className="flex items-center gap-1.5">
            <input type="radio" value={t} {...register('type')} /> {CUSTOMER_TYPE_LABEL[t]}
          </label>
        ))}
        <label className="ml-2 flex items-center gap-1.5">
          <input type="checkbox" {...register('isSupplier')} /> Là nhà cung cấp
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" {...register('isInternal')} /> Là đối tượng nội bộ
        </label>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
        <Field label="Mã khách hàng *" error={formState.errors.code?.message}>
          <input {...register('code')} className={inputCls} />
        </Field>
        <Field label="Tên khách hàng *" error={formState.errors.name?.message}>
          <input {...register('name')} className={inputCls} />
        </Field>
        <Field label="Mã số thuế / CCCD chủ hộ">
          <input {...register('taxCode')} className={inputCls} />
        </Field>
        <Field label="Mã số ĐVQHNS">
          <input {...register('budgetRelationCode')} className={inputCls} />
        </Field>
        <Field label="Điện thoại">
          <input {...register('phone')} className={inputCls} />
        </Field>
        <Field label="Website">
          <input {...register('website')} className={inputCls} />
        </Field>
        <Field label="Địa chỉ">
          <input {...register('address')} className={inputCls} />
        </Field>
        <Field label="Nhóm khách hàng">
          <input {...register('groupId')} className={inputCls} />
        </Field>
        <Field label="Nhân viên bán hàng">
          <input {...register('salesEmployeeId')} className={inputCls} />
        </Field>
      </div>

      {/* Thông tin liên hệ / nhận HĐĐT */}
      <div className="rounded-md border border-border p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Người nhận hóa đơn điện tử
        </p>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
          <Field label="Họ và tên">
            <input {...register('contactName')} className={inputCls} />
          </Field>
          <Field label="Email (ngăn cách bằng ;)">
            <input {...register('contactEmail')} className={inputCls} />
          </Field>
          <Field label="Số điện thoại">
            <input {...register('contactPhone')} className={inputCls} />
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

const inputCls =
  'h-9 w-full rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
