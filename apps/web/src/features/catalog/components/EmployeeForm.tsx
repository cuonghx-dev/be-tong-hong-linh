import type { CreateEmployeeInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/shared/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Input } from '@/shared/ui/input'
import { Field } from '@/shared/ui/field'
import { CheckboxField } from '@/shared/ui/checkbox-field'
import { useBanks } from '../api/useBanks'
import { useEmployee } from '../api/useEmployees'
import { useCreateEmployee, useUpdateEmployee } from '../api/useEmployeeMutations'
import { useOrganizationUnits } from '../api/useOrganizationUnits'
import { employeeSchema, type EmployeeFormValues } from '../schema'

interface Props {
  employeeId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: EmployeeFormValues = {
  code: '',
  name: '',
  isActive: true,
}

export function EmployeeForm({ employeeId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useEmployee(employeeId ?? null)
  const create = useCreateEmployee()
  const update = useUpdateEmployee()

  // Danh mục ngân hàng cho combobox "Tên ngân hàng".
  const banks = useBanks({ page: 1, pageSize: 200, isActive: true })
  // Cơ cấu tổ chức cho combobox "Đơn vị (phòng ban)".
  const orgUnits = useOrganizationUnits({ page: 1, pageSize: 200, isActive: true })

  const { register, control, handleSubmit, reset, watch, formState } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: DEFAULTS,
  })
  const bankName = watch('bankName')
  const department = watch('department')

  useEffect(() => {
    const e = editing.data
    if (!e) return
    reset({
      code: e.code,
      name: e.name,
      title: e.title ?? undefined,
      department: e.department ?? undefined,
      bankAccount: e.bankAccount ?? undefined,
      bankName: e.bankName ?? undefined,
      isActive: e.isActive,
    })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreateEmployeeInput = values
    if (employeeId) await update.mutateAsync({ id: employeeId, dto })
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
          <Field label="Mã nhân viên" required error={formState.errors.code?.message}>
            <Input {...register('code')} />
          </Field>
          <Field label="Tên nhân viên" required error={formState.errors.name?.message}>
            <Input {...register('name')} />
          </Field>
          <Field label="Chức danh">
            <Input {...register('title')} />
          </Field>
          <Field label="Đơn vị (phòng ban)">
            <Controller
              control={control}
              name="department"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Chọn đơn vị --" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Giá trị cũ không còn trong cơ cấu tổ chức (nhập khẩu / ngừng dùng) vẫn hiển thị được. */}
                    {department && !orgUnits.data?.data.some((u) => u.name === department) && (
                      <SelectItem value={department}>{department}</SelectItem>
                    )}
                    {(orgUnits.data?.data ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.name}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Số tài khoản ngân hàng">
            <Input {...register('bankAccount')} />
          </Field>
          <Field label="Tên ngân hàng">
            <Controller
              control={control}
              name="bankName"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Chọn ngân hàng --" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Giá trị cũ không còn trong danh mục (ngừng sử dụng / nhập tay) vẫn hiển thị được. */}
                    {bankName && !banks.data?.data.some((b) => b.shortName === bankName) && (
                      <SelectItem value={bankName}>{bankName}</SelectItem>
                    )}
                    {(banks.data?.data ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.shortName}>
                        {b.shortName} - {b.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
