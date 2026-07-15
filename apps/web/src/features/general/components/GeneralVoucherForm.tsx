import { type CreateGeneralVoucherInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { getApiErrorMessage } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import { PlusIcon } from '@/shared/ui/icons'
import { useToast } from '@/shared/ui/toast'
import { cn } from '@/shared/lib/cn'
import { useGeneralVoucher, useNextGeneralVoucherNo } from '../api/useGeneralVouchers'
import {
  useCreateGeneralVoucher,
  useUpdateGeneralVoucher,
} from '../api/useGeneralVoucherMutations'
import {
  generalVoucherSchema,
  type GeneralLineFormValues,
  type GeneralVoucherFormValues,
} from '../schema'
import { AmountInput } from './AmountInput'

interface GeneralVoucherFormProps {
  voucherId?: string | null
  // Nhân bản: id chứng từ nguồn — nạp sẵn dữ liệu, lưu thành chứng từ mới.
  duplicateFromId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

// NVK không có định khoản mặc định — TK Nợ/Có tự nhập.
const emptyLine = (): GeneralLineFormValues => ({
  amount: 0,
  debitAccount: '',
  creditAccount: '',
})

function defaultValues(): GeneralVoucherFormValues {
  return {
    postingDate: today(),
    voucherDate: today(),
    description: '',
    lines: [emptyLine()],
  }
}

export function GeneralVoucherForm({
  voucherId,
  duplicateFromId,
  readOnly = false,
  onSaved,
  onCancel,
}: GeneralVoucherFormProps) {
  // Nạp dữ liệu từ chứng từ đang sửa HOẶC chứng từ nguồn khi nhân bản.
  const duplicating = !voucherId && !!duplicateFromId
  const editing = useGeneralVoucher(voucherId ?? duplicateFromId ?? null)
  const create = useCreateGeneralVoucher()
  const update = useUpdateGeneralVoucher()
  const { toast } = useToast()

  const form = useForm<GeneralVoucherFormValues>({
    resolver: zodResolver(generalVoucherSchema),
    defaultValues: defaultValues(),
  })
  const { control, register, handleSubmit, reset, watch, formState } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  // Preview số chứng từ kế tiếp khi tạo mới — số thật vẫn cấp lúc Lưu.
  const nextNo = useNextGeneralVoucherNo(watch('voucherDate'), !voucherId)

  // Nạp dữ liệu khi xem/sửa.
  useEffect(() => {
    const v = editing.data
    if (!v) return
    reset({
      // Nhân bản → ngày về hôm nay (chứng từ mới), sửa → giữ nguyên ngày gốc.
      postingDate: duplicating ? today() : v.postingDate.slice(0, 10),
      voucherDate: duplicating ? today() : v.voucherDate.slice(0, 10),
      description: v.description ?? undefined,
      branchId: v.branchId ?? undefined,
      lines: v.lines.map((l) => ({
        description: l.description ?? undefined,
        debitAccount: l.debitAccount,
        creditAccount: l.creditAccount,
        amount: Number(l.amount),
        partnerId: l.partnerId ?? undefined,
        partnerName: l.partnerName ?? undefined,
      })),
    })
  }, [editing.data, reset, duplicating])

  const lines = watch('lines')
  const total = lines?.reduce((s, l) => s + (l.amount || 0), 0) ?? 0

  // Dòng mới kế thừa Diễn giải từ header (MISA tự điền).
  const newLine = (): GeneralLineFormValues => ({
    ...emptyLine(),
    description: watch('description'),
  })

  const submit = (goNext: boolean) =>
    handleSubmit(async (values) => {
      const dto: CreateGeneralVoucherInput = {
        postingDate: values.postingDate,
        voucherDate: values.voucherDate,
        description: values.description,
        branchId: values.branchId,
        lines: values.lines.map((l) => ({
          description: l.description,
          debitAccount: l.debitAccount ?? '',
          creditAccount: l.creditAccount ?? '',
          amount: l.amount,
          partnerId: l.partnerId,
          partnerName: l.partnerName,
        })),
      }
      try {
        if (voucherId) {
          await update.mutateAsync({ id: voucherId, dto })
        } else {
          await create.mutateAsync(dto)
        }
        if (goNext && !voucherId) {
          reset(defaultValues())
        } else {
          onSaved()
        }
      } catch (e) {
        toast({
          variant: 'error',
          title: 'Lưu chứng từ thất bại',
          description: getApiErrorMessage(e),
        })
      }
    })

  const saving = create.isPending || update.isPending

  return (
    <form className="flex h-full flex-col">
      <fieldset disabled={readOnly} className="flex-1 space-y-4 overflow-y-auto disabled:opacity-90">
        {/* Thông tin chung: diễn giải | ngày + số chứng từ | tổng tiền */}
        <div className="flex flex-wrap gap-6">
          <div className="min-w-[520px] flex-1 space-y-3">
            <Field label="Diễn giải">
              <input {...register('description')} className={inputCls} />
            </Field>
          </div>

          {/* Cột phải: ngày + số chứng từ */}
          <div className="w-56 space-y-3">
            <Field label="Ngày hạch toán" error={formState.errors.postingDate?.message}>
              <input type="date" {...register('postingDate')} className={inputCls} />
            </Field>
            <Field label="Ngày chứng từ" error={formState.errors.voucherDate?.message}>
              <input type="date" {...register('voucherDate')} className={inputCls} />
            </Field>
            <Field label="Số chứng từ">
              <input
                value={voucherId ? (editing.data?.voucherNo ?? '…') : (nextNo.data ?? 'Tự động')}
                readOnly
                title="Số dự kiến — cấp chính thức khi Lưu"
                className={cn(inputCls, 'bg-slate-50 text-slate-500')}
              />
            </Field>
          </div>

          {/* Tổng tiền */}
          <div className="ml-auto text-right">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Tổng tiền
            </div>
            <div className="mt-1 text-3xl font-semibold tabular-nums text-slate-800">
              {formatCurrency(total)}
            </div>
          </div>
        </div>

        {/* Bảng hạch toán */}
        <div className="space-y-2">
          <span className="text-base font-semibold text-slate-700">Hạch toán</span>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-8 px-2 py-1.5 text-center">#</th>
                  <th className="px-2 py-1.5">Diễn giải</th>
                  <th className="w-24 px-2 py-1.5">TK Nợ</th>
                  <th className="w-24 px-2 py-1.5">TK Có</th>
                  <th className="w-36 px-2 py-1.5 text-right">Số tiền</th>
                  <th className="px-2 py-1.5">Đối tượng</th>
                  <th className="px-2 py-1.5">Tên đối tượng</th>
                  <th className="w-8 px-2 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {fields.map((f, i) => (
                  <tr key={f.id} className="border-t border-border">
                    <td className="px-2 py-1 text-center text-slate-400">{i + 1}</td>
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.description`)} className={cellCls} />
                    </td>
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.debitAccount`)} className={cellCls} />
                    </td>
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.creditAccount`)} className={cellCls} />
                    </td>
                    <td className="px-2 py-1">
                      <Controller
                        control={control}
                        name={`lines.${i}.amount`}
                        render={({ field }) => (
                          <AmountInput value={field.value} onChange={field.onChange} />
                        )}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.partnerId`)} className={cellCls} />
                    </td>
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.partnerName`)} className={cellCls} />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => fields.length > 1 && remove(i)}
                        className="text-slate-400 hover:text-red-600"
                        aria-label="Xóa dòng"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-medium">
                <tr className="border-t border-border">
                  <td className="px-2 py-1.5" colSpan={4} />
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(total)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              Tổng số: <b className="text-slate-700">{fields.length}</b> bản ghi
            </span>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => append(newLine())}>
              <PlusIcon size={14} /> Thêm dòng
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => reset({ ...watch(), lines: [newLine()] })}
            >
              Xóa hết dòng
            </Button>
          </div>
        </div>

        {typeof formState.errors.lines?.message === 'string' && (
          <p className="text-sm text-red-600">{formState.errors.lines.message}</p>
        )}
      </fieldset>

      {/* Thanh hành động */}
      <div className="mt-3 flex items-center border-t border-border pt-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          {readOnly ? 'Đóng' : 'Hủy'}
        </Button>

        {!readOnly && (
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={submit(false)} disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu'}
            </Button>
            <Button type="button" onClick={submit(!voucherId)} disabled={saving}>
              {voucherId ? 'Lưu' : 'Lưu và Thêm'}
            </Button>
          </div>
        )}
      </div>
    </form>
  )
}

// ── Local UI bits ─────────────────────────────────────────────────────────
const inputCls =
  'h-9 w-full rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
const cellCls =
  'h-8 w-full rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
