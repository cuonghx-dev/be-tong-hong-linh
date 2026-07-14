import type { CreateEmployeeInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/shared/ui/button'
import { useEmployee } from '../api/useEmployees'
import { useCreateEmployee, useUpdateEmployee } from '../api/useEmployeeMutations'
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

  const { register, handleSubmit, reset, formState } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: DEFAULTS,
  })

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
            <input {...register('code')} className={inputCls} />
          </Field>
          <Field label="Tên nhân viên" required error={formState.errors.name?.message}>
            <input {...register('name')} className={inputCls} />
          </Field>
          <Field label="Chức danh">
            <input {...register('title')} className={inputCls} />
          </Field>
          <Field label="Đơn vị (phòng ban)">
            <input {...register('department')} className={inputCls} />
          </Field>
          <Field label="Số tài khoản ngân hàng">
            <input {...register('bankAccount')} className={inputCls} />
          </Field>
          <Field label="Tên ngân hàng">
            <input {...register('bankName')} className={inputCls} />
          </Field>
        </div>

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
