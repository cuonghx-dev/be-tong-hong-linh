import { SupplierType, type CreateSupplierInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useEmployees, usePartnerGroups } from '@/features/catalog'
import { Button } from '@/shared/ui/button'
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

  const { register, handleSubmit, reset, formState } = useForm<SupplierFormValues>({
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
        {Object.values(SupplierType).map((t) => (
          <label key={t} className="flex items-center gap-1.5 text-sm">
            <input type="radio" value={t} {...register('type')} />
            {SUPPLIER_TYPE_LABEL[t]}
          </label>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-sm">
          <input type="checkbox" {...register('isCustomer')} />
          Là khách hàng
        </label>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
        <Field label="Mã nhà cung cấp" required error={formState.errors.code?.message}>
          <input {...register('code')} className={inputCls} />
        </Field>
        <Field label="Tên nhà cung cấp" required error={formState.errors.name?.message}>
          <input {...register('name')} className={inputCls} />
        </Field>
        <Field label="Mã số thuế/CCCD">
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
        <Field label="Nhóm nhà cung cấp">
          <select {...register('groupId')} className={inputCls}>
            <option value="">-- Chọn nhóm nhà cung cấp --</option>
            {(groups.data?.data ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.code} - {g.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nhân viên mua hàng">
          <select {...register('employeeId')} className={inputCls}>
            <option value="">-- Chọn nhân viên --</option>
            {(employees.data?.data ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.code} - {e.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Rủi ro về hóa đơn">
          <input {...register('invoiceRisk')} className={inputCls} />
        </Field>
      </div>

      <label className="flex items-center gap-1.5 text-sm">
        <input type="checkbox" {...register('isInternal')} />
        Là đối tượng nội bộ
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
              {saving ? 'Đang lưu…' : 'Lưu'}
            </Button>
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
