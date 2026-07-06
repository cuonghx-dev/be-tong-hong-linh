import {
  CashVoucherCategory,
  CashVoucherType,
  CHART_OF_ACCOUNTS,
  PartnerType,
  type CreateCashVoucherInput,
} from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { formatCurrency } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import { PlusIcon } from '@/shared/ui/icons'
import { cn } from '@/shared/lib/cn'
import { useCashVoucher } from '../api/useCashVouchers'
import {
  useCreateCashVoucher,
  useUpdateCashVoucher,
} from '../api/useCashVoucherMutations'
import { cashVoucherSchema, type CashLineFormValues, type CashVoucherFormValues } from '../schema'
import { CATEGORY_LABEL, CATEGORY_OPTIONS, PARTNER_TYPE_LABEL, lineColumns } from '../types'
import { AmountInput } from './AmountInput'

interface CashVoucherFormProps {
  type: CashVoucherType
  voucherId?: string | null
  onSaved: () => void
  onCancel: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

// Dòng mặc định — định khoản theo loại nghiệp vụ (§8.3).
function emptyLine(category: CashVoucherCategory, type: CashVoucherType): CashLineFormValues {
  if (category === CashVoucherCategory.DepositToBank) {
    return { amount: 0, debitAccount: CHART_OF_ACCOUNTS.BANK_DEPOSIT, creditAccount: CHART_OF_ACCOUNTS.CASH_ON_HAND }
  }
  return type === CashVoucherType.Receipt
    ? { amount: 0, debitAccount: CHART_OF_ACCOUNTS.CASH_ON_HAND, creditAccount: '' }
    : { amount: 0, debitAccount: '', creditAccount: CHART_OF_ACCOUNTS.CASH_ON_HAND }
}

function defaultValues(type: CashVoucherType): CashVoucherFormValues {
  const category = type === CashVoucherType.Receipt ? CashVoucherCategory.Receipt : CashVoucherCategory.Payment
  return {
    type,
    category,
    postingDate: today(),
    voucherDate: today(),
    partnerType: PartnerType.Customer,
    reason: type === CashVoucherType.Receipt ? 'Thu tiền của ' : 'Chi tiền cho ',
    lines: [emptyLine(category, type)],
  }
}

export function CashVoucherForm({ type, voucherId, onSaved, onCancel }: CashVoucherFormProps) {
  const isReceipt = type === CashVoucherType.Receipt
  const editing = useCashVoucher(voucherId ?? null)
  const create = useCreateCashVoucher()
  const update = useUpdateCashVoucher()

  const form = useForm<CashVoucherFormValues>({
    resolver: zodResolver(cashVoucherSchema),
    defaultValues: defaultValues(type),
  })
  const { control, register, handleSubmit, reset, watch, setValue, formState } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  // Nạp dữ liệu khi sửa.
  useEffect(() => {
    const v = editing.data
    if (!v) return
    reset({
      type: v.type,
      category: v.category,
      postingDate: v.postingDate.slice(0, 10),
      voucherDate: v.voucherDate.slice(0, 10),
      partnerType: v.partnerType ?? undefined,
      partnerId: v.partnerId ?? undefined,
      partnerName: v.partnerName ?? undefined,
      payerReceiver: v.payerReceiver ?? undefined,
      address: v.address ?? undefined,
      employeeId: v.employeeId ?? undefined,
      reason: v.reason ?? undefined,
      attachmentCount: v.attachmentCount,
      branchId: v.branchId ?? undefined,
      lines: v.lines.map((l) => ({
        description: l.description ?? undefined,
        debitAccount: l.debitAccount,
        creditAccount: l.creditAccount,
        amount: Number(l.amount),
        operation: l.operation ?? undefined,
        partnerId: l.partnerId ?? undefined,
        partnerName: l.partnerName ?? undefined,
        costItemId: l.costItemId ?? undefined,
        bankAccountNo: l.bankAccountNo ?? undefined,
        bankName: l.bankName ?? undefined,
      })),
    })
  }, [editing.data, reset])

  const category = watch('category')
  const lines = watch('lines')
  const cols = lineColumns(category)
  const total = lines?.reduce((s, l) => s + (l.amount || 0), 0) ?? 0

  const submit = (goNext: boolean) =>
    handleSubmit(async (values) => {
      const dto: CreateCashVoucherInput = {
        ...values,
        lines: values.lines.map((l) => ({
          description: l.description,
          debitAccount: l.debitAccount ?? '',
          creditAccount: l.creditAccount ?? '',
          amount: l.amount,
          operation: l.operation,
          partnerId: l.partnerId,
          partnerName: l.partnerName,
          costItemId: cols.showCostItem ? l.costItemId : undefined,
          bankAccountNo: cols.showBank ? l.bankAccountNo : undefined,
          bankName: cols.showBank ? l.bankName : undefined,
        })),
      }
      if (voucherId) {
        await update.mutateAsync({ id: voucherId, dto })
      } else {
        await create.mutateAsync(dto)
      }
      if (goNext && !voucherId) {
        reset(defaultValues(type))
      } else {
        onSaved()
      }
    })

  const saving = create.isPending || update.isPending
  const colSpan = 4 + (cols.showPartner ? 2 : 0) + (cols.showCostItem ? 1 : 0) + (cols.showBank ? 2 : 0)

  return (
    <form className="space-y-4">
      {/* Loại nghiệp vụ */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium text-slate-600">Loại nghiệp vụ</label>
        <select
          {...register('category')}
          onChange={(e) => {
            const next = e.target.value as CashVoucherCategory
            setValue('category', next)
            // Đổi loại nghiệp vụ → reset định khoản mặc định dòng đầu.
            setValue('lines.0.debitAccount', emptyLine(next, type).debitAccount)
            setValue('lines.0.creditAccount', emptyLine(next, type).creditAccount)
          }}
          className="h-8 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {CATEGORY_OPTIONS[type].map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      {/* Thông tin chung */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
        <Field label="Mã đối tượng">
          <div className="flex gap-2">
            <select
              {...register('partnerType')}
              className="h-9 rounded-md border border-border px-2 text-sm"
            >
              {Object.values(PartnerType).map((t) => (
                <option key={t} value={t}>
                  {PARTNER_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <input {...register('partnerId')} className={inputCls} placeholder="Mã" />
          </div>
        </Field>
        <Field label="Tên đối tượng">
          <input {...register('partnerName')} className={inputCls} />
        </Field>

        {isReceipt ? (
          <>
            <Field label="Người nộp">
              <input {...register('payerReceiver')} className={inputCls} />
            </Field>
            <Field label="Địa chỉ">
              <input {...register('address')} className={inputCls} />
            </Field>
            <Field label="Nhân viên">
              <input {...register('employeeId')} className={inputCls} />
            </Field>
            <Field label="Lý do nộp">
              <input {...register('reason')} className={inputCls} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Người nhận">
              <input {...register('payerReceiver')} className={inputCls} />
            </Field>
            <Field label="Địa chỉ">
              <input {...register('address')} className={inputCls} />
            </Field>
            {/* PC: Lý do chi nằm TRÊN Nhân viên (§4) */}
            <Field label="Lý do chi">
              <input {...register('reason')} className={inputCls} />
            </Field>
            <Field label="Nhân viên">
              <input {...register('employeeId')} className={inputCls} />
            </Field>
          </>
        )}

        <Field label="Kèm theo (chứng từ gốc)">
          <input type="number" min={0} {...register('attachmentCount')} className={inputCls} />
        </Field>
        <Field label={`Số phiếu ${isReceipt ? 'thu' : 'chi'}`}>
          <input
            value={editing.data?.voucherNo ?? 'Tự động'}
            readOnly
            className={cn(inputCls, 'bg-slate-50 text-slate-500')}
          />
        </Field>
        <Field label="Ngày hạch toán" error={formState.errors.postingDate?.message}>
          <input type="date" {...register('postingDate')} className={inputCls} />
        </Field>
        <Field label="Ngày phiếu" error={formState.errors.voucherDate?.message}>
          <input type="date" {...register('voucherDate')} className={inputCls} />
        </Field>
      </div>

      {/* Bảng hạch toán */}
      <div className="rounded-md border border-border">
        <div className="flex items-center gap-2 border-b border-border bg-slate-50 px-2 py-1.5">
          <span className="text-sm font-medium text-slate-600">Hạch toán</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(emptyLine(category, type))}
          >
            <PlusIcon size={14} /> Thêm dòng
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => reset({ ...watch(), lines: [emptyLine(category, type)] })}
          >
            Xóa hết dòng
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-8 px-2 py-1.5 text-center">#</th>
                <th className="px-2 py-1.5">Diễn giải</th>
                <th className="w-24 px-2 py-1.5">TK Nợ</th>
                <th className="w-24 px-2 py-1.5">TK Có</th>
                <th className="w-36 px-2 py-1.5 text-right">Số tiền</th>
                {cols.showPartner && <th className="px-2 py-1.5">Đối tượng</th>}
                {cols.showPartner && <th className="px-2 py-1.5">Tên đối tượng</th>}
                {cols.showCostItem && <th className="px-2 py-1.5">Khoản mục CP</th>}
                {cols.showBank && <th className="px-2 py-1.5">TK ngân hàng</th>}
                {cols.showBank && <th className="px-2 py-1.5">Tên ngân hàng</th>}
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
                  {cols.showPartner && (
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.partnerId`)} className={cellCls} />
                    </td>
                  )}
                  {cols.showPartner && (
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.partnerName`)} className={cellCls} />
                    </td>
                  )}
                  {cols.showCostItem && (
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.costItemId`)} className={cellCls} />
                    </td>
                  )}
                  {cols.showBank && (
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.bankAccountNo`)} className={cellCls} />
                    </td>
                  )}
                  {cols.showBank && (
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.bankName`)} className={cellCls} />
                    </td>
                  )}
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
                <td className="px-2 py-1.5" colSpan={4}>
                  Tổng cộng
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(total)}</td>
                <td colSpan={Math.max(colSpan - 5 + 1, 1)} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {typeof formState.errors.lines?.message === 'string' && (
        <p className="text-sm text-red-600">{formState.errors.lines.message}</p>
      )}

      {/* Nút hành động */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Hủy
        </Button>
        <Button type="button" onClick={submit(false)} disabled={saving}>
          {saving ? 'Đang cất…' : 'Cất'}
        </Button>
        {!voucherId && (
          <Button type="button" variant="secondary" onClick={submit(true)} disabled={saving}>
            {isReceipt ? 'Cất và Thêm' : 'Cất và In'}
          </Button>
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
