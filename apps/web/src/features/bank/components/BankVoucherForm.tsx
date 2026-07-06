import {
  BankPaymentMethod,
  BankVoucherCategory,
  BankVoucherType,
  CHART_OF_ACCOUNTS,
  PartnerType,
  type CreateBankVoucherInput,
} from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { formatCurrency } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import { PlusIcon } from '@/shared/ui/icons'
import { cn } from '@/shared/lib/cn'
import { useBankVoucher } from '../api/useBankVouchers'
import { useCreateBankVoucher, useUpdateBankVoucher } from '../api/useBankVoucherMutations'
import { bankVoucherSchema, type BankLineFormValues, type BankVoucherFormValues } from '../schema'
import { CATEGORY_LABEL, CATEGORY_OPTIONS, PARTNER_TYPE_LABEL, PAYMENT_METHOD_LABEL } from '../types'
import { AmountInput } from './AmountInput'

interface BankVoucherFormProps {
  type: BankVoucherType
  voucherId?: string | null
  onSaved: () => void
  onCancel: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

// Dòng mặc định — định khoản theo loại chứng từ (§8.3): Thu → Nợ 1121; Chi → Có 1121.
function emptyLine(type: BankVoucherType): BankLineFormValues {
  return type === BankVoucherType.Receipt
    ? { amount: 0, debitAccount: CHART_OF_ACCOUNTS.BANK_DEPOSIT, creditAccount: '' }
    : { amount: 0, debitAccount: '', creditAccount: CHART_OF_ACCOUNTS.BANK_DEPOSIT }
}

function defaultValues(type: BankVoucherType): BankVoucherFormValues {
  const isReceipt = type === BankVoucherType.Receipt
  return {
    type,
    category: isReceipt ? BankVoucherCategory.Receipt : BankVoucherCategory.Payment,
    paymentMethod: isReceipt ? undefined : BankPaymentMethod.UNC,
    isBatchTransfer: false,
    postingDate: today(),
    voucherDate: today(),
    bankAccountNo: '',
    partnerType: isReceipt ? PartnerType.Customer : PartnerType.Supplier,
    reason: isReceipt ? 'Thu tiền của ' : 'Chi tiền cho ',
    lines: [emptyLine(type)],
  }
}

export function BankVoucherForm({ type, voucherId, onSaved, onCancel }: BankVoucherFormProps) {
  const isReceipt = type === BankVoucherType.Receipt
  const editing = useBankVoucher(voucherId ?? null)
  const create = useCreateBankVoucher()
  const update = useUpdateBankVoucher()

  const form = useForm<BankVoucherFormValues>({
    resolver: zodResolver(bankVoucherSchema),
    defaultValues: defaultValues(type),
  })
  const { control, register, handleSubmit, reset, watch, formState } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  // Nạp dữ liệu khi sửa.
  useEffect(() => {
    const v = editing.data
    if (!v) return
    reset({
      type: v.type,
      category: v.category,
      paymentMethod: v.paymentMethod ?? undefined,
      isBatchTransfer: v.isBatchTransfer,
      internalRef: v.internalRef ?? undefined,
      postingDate: v.postingDate.slice(0, 10),
      voucherDate: v.voucherDate.slice(0, 10),
      bankAccountNo: v.bankAccountNo ?? '',
      bankName: v.bankName ?? undefined,
      receiverAccountNo: v.receiverAccountNo ?? undefined,
      partnerType: v.partnerType ?? undefined,
      partnerId: v.partnerId ?? undefined,
      partnerName: v.partnerName ?? undefined,
      address: v.address ?? undefined,
      employeeId: v.employeeId ?? undefined,
      reason: v.reason ?? undefined,
      reference: v.reference ?? undefined,
      attachmentCount: v.attachmentCount,
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
  }, [editing.data, reset])

  const lines = watch('lines')
  const total = lines?.reduce((s, l) => s + (l.amount || 0), 0) ?? 0

  const submit = (goNext: boolean) =>
    handleSubmit(async (values) => {
      const dto: CreateBankVoucherInput = {
        ...values,
        lines: values.lines.map((l) => ({
          description: l.description,
          debitAccount: l.debitAccount ?? '',
          creditAccount: l.creditAccount ?? '',
          amount: l.amount,
          partnerId: l.partnerId,
          partnerName: l.partnerName,
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

  return (
    <form className="space-y-4">
      {/* Loại nghiệp vụ + (chi) phương thức thanh toán + chuyển tiền theo lô */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Loại nghiệp vụ</label>
          <select
            {...register('category')}
            className="h-8 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {CATEGORY_OPTIONS[type].map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>

        {!isReceipt && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600">Phương thức TT</label>
              <select
                {...register('paymentMethod')}
                className="h-8 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {Object.values(BankPaymentMethod).map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              <input type="checkbox" {...register('isBatchTransfer')} />
              Là UNC chuyển tiền theo lô
            </label>
          </>
        )}

        {isReceipt && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Số UNC chi nhánh khác</label>
            <input
              {...register('internalRef')}
              placeholder="Nhập số UNB chuyển đến"
              className="h-8 w-56 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}
      </div>

      {/* Thông tin chung */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
        <Field
          label={isReceipt ? 'Nộp vào tài khoản' : 'Tài khoản chi'}
          error={formState.errors.bankAccountNo?.message}
        >
          <input
            {...register('bankAccountNo')}
            className={inputCls}
            placeholder="Số TK ngân hàng"
          />
        </Field>
        <Field label="Tên ngân hàng">
          <input {...register('bankName')} className={inputCls} placeholder="Auto theo số TK" />
        </Field>

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

        <Field label="Địa chỉ">
          <input {...register('address')} className={inputCls} />
        </Field>
        {isReceipt ? (
          <Field label="Nhân viên thu nợ">
            <input {...register('employeeId')} className={inputCls} />
          </Field>
        ) : (
          <Field label="Tài khoản nhận">
            <input {...register('receiverAccountNo')} className={inputCls} />
          </Field>
        )}

        {isReceipt ? (
          <Field label="Lý do thu">
            <input {...register('reason')} className={inputCls} />
          </Field>
        ) : (
          <>
            {/* UNC: Nội dung thanh toán nằm TRÊN Nhân viên (§4) */}
            <Field label="Nội dung thanh toán">
              <input {...register('reason')} className={inputCls} />
            </Field>
            <Field label="Nhân viên">
              <input {...register('employeeId')} className={inputCls} />
            </Field>
          </>
        )}

        <Field label="Tham chiếu">
          <input {...register('reference')} className={inputCls} />
        </Field>
        <Field label={`Số chứng từ`}>
          <input
            value={editing.data?.voucherNo ?? 'Tự động'}
            readOnly
            className={cn(inputCls, 'bg-slate-50 text-slate-500')}
          />
        </Field>
        <Field label="Ngày hạch toán" error={formState.errors.postingDate?.message}>
          <input type="date" {...register('postingDate')} className={inputCls} />
        </Field>
        <Field label="Ngày chứng từ" error={formState.errors.voucherDate?.message}>
          <input type="date" {...register('voucherDate')} className={inputCls} />
        </Field>
      </div>

      {/* Bảng hạch toán */}
      <div className="rounded-md border border-border">
        <div className="flex items-center gap-2 border-b border-border bg-slate-50 px-2 py-1.5">
          <span className="text-sm font-medium text-slate-600">Hạch toán</span>
          <Button type="button" variant="outline" size="sm" onClick={() => append(emptyLine(type))}>
            <PlusIcon size={14} /> Thêm dòng
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => reset({ ...watch(), lines: [emptyLine(type)] })}
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
                <td className="px-2 py-1.5" colSpan={4}>
                  Tổng cộng
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(total)}</td>
                <td colSpan={3} />
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
            {isReceipt ? 'Cất và In' : 'Cất và Thêm'}
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
