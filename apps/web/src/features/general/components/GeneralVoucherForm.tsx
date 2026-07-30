import {
  GENERAL_LINE_OPERATION_LABELS,
  GeneralLineOperation,
  type CreateGeneralVoucherInput,
} from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { getApiErrorMessage } from '@/shared/lib/api'
import { invalidToast } from '@/shared/lib/form'
import { formatCurrency } from '@/shared/lib/currency'
import { usePartnerOptions } from '@/shared/api/usePartnerOptions'
import { AccountPicker, accountCellCls } from '@/shared/ui/account-picker'
import { Button } from '@/shared/ui/button'
import { PlusIcon } from '@/shared/ui/icons'
import { PartnerPicker, type PartnerOption } from '@/shared/ui/partner-picker'
import { QuickAddPartnerDialog } from '@/shared/ui/quick-add-partner-dialog'
import { useToast } from '@/shared/ui/toast'
import { cn } from '@/shared/lib/cn'
import { num } from '@/shared/lib/num'
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

// Vế bút toán của ô đối tượng — dùng để dựng tên field (debitPartnerId / creditPartnerId).
type PartnerSide = 'debit' | 'credit'

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
  const { control, register, handleSubmit, reset, watch, setValue, formState } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  // Picker đối tượng theo dòng (+ tạo nhanh) — MISA tách đối tượng vế Nợ và vế Có.
  const [partnerKw, setPartnerKw] = useState('')
  const { items: partnerItems, loading: partnerLoading } = usePartnerOptions(partnerKw)
  // Dialog tạo nhanh gắn với ô đang thao tác (null = đóng) — nhớ cả vế để điền lại đúng cột.
  const [partnerDialogAt, setPartnerDialogAt] = useState<{ line: number; side: PartnerSide } | null>(
    null,
  )
  const selectLinePartner = (i: number, side: PartnerSide, p: PartnerOption) => {
    setValue(`lines.${i}.${side}PartnerId`, p.code)
    setValue(`lines.${i}.${side}PartnerName`, p.name)
  }

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
      dueDate: v.dueDate ? v.dueDate.slice(0, 10) : undefined,
      description: v.description ?? undefined,
      referenceNo: v.referenceNo ?? undefined,
      branchId: v.branchId ?? undefined,
      lines: v.lines.map((l) => ({
        description: l.description ?? undefined,
        debitAccount: l.debitAccount,
        creditAccount: l.creditAccount,
        amount: Number(l.amount),
        operation: l.operation ?? undefined,
        debitPartnerId: l.debitPartnerId ?? undefined,
        debitPartnerName: l.debitPartnerName ?? undefined,
        creditPartnerId: l.creditPartnerId ?? undefined,
        creditPartnerName: l.creditPartnerName ?? undefined,
      })),
    })
  }, [editing.data, reset, duplicating])

  const lines = watch('lines')
  const total = lines?.reduce((s, l) => s + num(l.amount), 0) ?? 0

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
        dueDate: values.dueDate || null,
        description: values.description,
        referenceNo: values.referenceNo,
        branchId: values.branchId,
        lines: values.lines.map((l) => ({
          description: l.description,
          debitAccount: l.debitAccount ?? '',
          creditAccount: l.creditAccount ?? '',
          amount: l.amount,
          operation: l.operation || null,
          debitPartnerId: l.debitPartnerId,
          debitPartnerName: l.debitPartnerName,
          creditPartnerId: l.creditPartnerId,
          creditPartnerName: l.creditPartnerName,
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
    }, invalidToast(toast)) // toast lỗi validate — tránh bấm Lưu không thấy phản hồi

  const saving = create.isPending || update.isPending

  return (
    <form className="flex h-full flex-col">
      <fieldset disabled={readOnly} className="flex-1 overflow-y-auto disabled:opacity-90">
        {/* Vùng thông tin chung — nền primary nhạt liền khối với page header (2 lớp màu, đồng bộ cash) */}
        <section className="space-y-3 bg-primary/5 px-6 pb-5 pt-2">
        {/* Thông tin chung: diễn giải | ngày + số chứng từ | tổng tiền */}
        <div className="flex flex-wrap gap-6">
          <div className="min-w-[520px] flex-1 space-y-3">
            <Field label="Diễn giải">
              <input {...register('description')} className={inputCls} />
            </Field>
            <div className="flex gap-3">
              <Field label="Hạn thanh toán" className="w-56">
                <input type="date" {...register('dueDate')} className={inputCls} />
              </Field>
              <Field label="Tham chiếu" className="flex-1">
                <input
                  {...register('referenceNo')}
                  placeholder="Số chứng từ gốc / hợp đồng"
                  className={inputCls}
                />
              </Field>
            </div>
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
        </section>

        {/* Bảng hạch toán — lớp nền trắng */}
        <section className="space-y-2 px-6 py-5">
          <span className="text-base font-semibold text-slate-700">Hạch toán</span>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-8 px-2 py-1.5 text-center">#</th>
                  <th className="px-2 py-1.5">Diễn&nbsp;giải</th>
                  <th className="w-24 px-2 py-1.5">TK Nợ</th>
                  <th className="w-24 px-2 py-1.5">TK Có</th>
                  <th className="w-36 px-2 py-1.5 text-right">Số&nbsp;tiền</th>
                  <th className="w-40 px-2 py-1.5">Nghiệp&nbsp;vụ</th>
                  <th className="px-2 py-1.5">Đối&nbsp;tượng Nợ</th>
                  <th className="px-2 py-1.5">Tên đối&nbsp;tượng Nợ</th>
                  <th className="px-2 py-1.5">Đối&nbsp;tượng Có</th>
                  <th className="px-2 py-1.5">Tên đối&nbsp;tượng Có</th>
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
                      <Controller
                        control={control}
                        name={`lines.${i}.debitAccount`}
                        render={({ field, fieldState }) => (
                          <AccountPicker
                            value={field.value}
                            onChange={field.onChange}
                            inputClassName={cn(
                              accountCellCls,
                              fieldState.error && 'rounded ring-1 ring-inset ring-red-500',
                            )}
                          />
                        )}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Controller
                        control={control}
                        name={`lines.${i}.creditAccount`}
                        render={({ field, fieldState }) => (
                          <AccountPicker
                            value={field.value}
                            onChange={field.onChange}
                            inputClassName={cn(
                              accountCellCls,
                              fieldState.error && 'rounded ring-1 ring-inset ring-red-500',
                            )}
                          />
                        )}
                      />
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
                      <select {...register(`lines.${i}.operation`)} className={cellCls}>
                        <option value="">--</option>
                        {Object.values(GeneralLineOperation).map((op) => (
                          <option key={op} value={op}>
                            {GENERAL_LINE_OPERATION_LABELS[op]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <PartnerPicker
                        value={lines?.[i]?.debitPartnerId}
                        items={partnerItems}
                        loading={partnerLoading}
                        keyword={partnerKw}
                        onKeywordChange={setPartnerKw}
                        onSelect={(p) => selectLinePartner(i, 'debit', p)}
                        onAddNew={() => setPartnerDialogAt({ line: i, side: 'debit' })}
                        inputClassName="h-8"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.debitPartnerName`)} className={cellCls} />
                    </td>
                    <td className="px-2 py-1">
                      <PartnerPicker
                        value={lines?.[i]?.creditPartnerId}
                        items={partnerItems}
                        loading={partnerLoading}
                        keyword={partnerKw}
                        onKeywordChange={setPartnerKw}
                        onSelect={(p) => selectLinePartner(i, 'credit', p)}
                        onAddNew={() => setPartnerDialogAt({ line: i, side: 'credit' })}
                        inputClassName="h-8"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.creditPartnerName`)} className={cellCls} />
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
                  <td colSpan={6} />
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

          {typeof formState.errors.lines?.message === 'string' && (
            <p className="text-sm text-red-600">{formState.errors.lines.message}</p>
          )}
        </section>
      </fieldset>

      {/* Thanh hành động */}
      <div className="flex items-center border-t border-border px-6 py-3">
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

      <QuickAddPartnerDialog
        open={partnerDialogAt !== null}
        onClose={() => setPartnerDialogAt(null)}
        initialCode={partnerKw.trim() || undefined}
        onCreated={(p) => {
          setPartnerKw('')
          if (partnerDialogAt) selectLinePartner(partnerDialogAt.line, partnerDialogAt.side, p)
        }}
      />
    </form>
  )
}

// ── Local UI bits ─────────────────────────────────────────────────────────
const inputCls =
  'h-9 w-full rounded-md border border-border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
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
