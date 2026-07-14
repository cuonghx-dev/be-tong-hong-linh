import type { CreateBankInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/shared/ui/button'
import { useBank } from '../api/useBanks'
import { useCreateBank, useUpdateBank } from '../api/useBankMutations'
import { bankSchema, type BankFormValues } from '../schema'

interface Props {
  bankId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: BankFormValues = {
  shortName: '',
  fullName: '',
  isActive: true,
}

export function BankForm({ bankId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useBank(bankId ?? null)
  const create = useCreateBank()
  const update = useUpdateBank()

  const { register, handleSubmit, reset, formState } = useForm<BankFormValues>({
    resolver: zodResolver(bankSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    const b = editing.data
    if (!b) return
    reset({
      shortName: b.shortName,
      fullName: b.fullName,
      isActive: b.isActive,
    })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreateBankInput = values
    if (bankId) await update.mutateAsync({ id: bankId, dto })
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
          <Field label="Tên viết tắt" required error={formState.errors.shortName?.message}>
            <input {...register('shortName')} className={inputCls} />
          </Field>
          <Field label="Tên đầy đủ" required error={formState.errors.fullName?.message}>
            <input {...register('fullName')} className={inputCls} />
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
