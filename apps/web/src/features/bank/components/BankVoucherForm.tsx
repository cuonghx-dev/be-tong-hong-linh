import {
  BankPaymentMethod,
  BankVoucherCategory,
  BankVoucherType,
  CHART_OF_ACCOUNTS,
  PartnerType,
  type CreateBankVoucherInput,
} from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { forwardRef, useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { usePartnerOptions } from '@/shared/api/usePartnerOptions'
import { formatCurrency } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import { ChevronDownIcon, PlusIcon } from '@/shared/ui/icons'
import { PartnerPicker } from '@/shared/ui/partner-picker'
import { cn } from '@/shared/lib/cn'
import { useBankVoucher } from '../api/useBankVouchers'
import { useCreateBankVoucher, useUpdateBankVoucher } from '../api/useBankVoucherMutations'
import { bankVoucherSchema, type BankLineFormValues, type BankVoucherFormValues } from '../schema'
import { CATEGORY_LABEL, CATEGORY_OPTIONS, PAYMENT_METHOD_LABEL } from '../types'
import { AmountInput } from './AmountInput'

interface BankVoucherFormProps {
  type: BankVoucherType
  voucherId?: string | null
  readOnly?: boolean
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

export function BankVoucherForm({
  type,
  voucherId,
  readOnly = false,
  onSaved,
  onCancel,
}: BankVoucherFormProps) {
  const isReceipt = type === BankVoucherType.Receipt
  const editing = useBankVoucher(voucherId ?? null)
  const create = useCreateBankVoucher()
  const update = useUpdateBankVoucher()

  const form = useForm<BankVoucherFormValues>({
    resolver: zodResolver(bankVoucherSchema),
    defaultValues: defaultValues(type),
  })
  const { control, register, handleSubmit, reset, watch, setValue, formState } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  // Picker "Mã đối tượng" (nguồn tạm: khách hàng + nhà cung cấp).
  const [partnerKw, setPartnerKw] = useState('')
  const { items: partnerItems, loading: partnerLoading } = usePartnerOptions(partnerKw)

  // Dòng mới kế thừa Diễn giải + Đối tượng/Tên đối tượng từ header (MISA tự điền).
  const newLine = (): BankLineFormValues => ({
    ...emptyLine(type),
    description: watch('reason'),
    partnerId: watch('partnerId'),
    partnerName: watch('partnerName'),
  })

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
    <form className="flex h-full flex-col">
      <fieldset disabled={readOnly} className="flex-1 space-y-4 overflow-y-auto disabled:opacity-90">
        {/* Loại nghiệp vụ + (thu) số UNC chi nhánh / (chi) phương thức TT */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              {...register('category')}
              className="h-9 min-w-[180px] rounded-md border border-border pl-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {CATEGORY_OPTIONS[type].map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              size={14}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          {isReceipt ? (
            <input
              {...register('internalRef')}
              placeholder="Nhập số UNC từ chi nhánh khác chuyển đến"
              className="h-9 w-80 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Phương thức TT</label>
                <select
                  {...register('paymentMethod')}
                  className="h-9 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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
        </div>

        {/* Thông tin chung: cột trái (đối tượng/tài khoản) | cột phải (ngày) | tổng tiền */}
        <div className="flex flex-wrap gap-6">
          {/* Cột trái */}
          <div className="grid min-w-[520px] flex-1 grid-cols-2 gap-x-6 gap-y-3">
            <Field label="Mã đối tượng" error={formState.errors.partnerId?.message}>
              <PartnerPicker
                value={watch('partnerId')}
                items={partnerItems}
                loading={partnerLoading}
                keyword={partnerKw}
                onKeywordChange={setPartnerKw}
                onSelect={(p) => {
                  setValue('partnerId', p.code)
                  setValue('partnerName', p.name)
                  setValue('partnerType', p.type)
                  if (p.address) setValue('address', p.address)
                  // Lý do/Nội dung: "Thu tiền của <tên>" / "Chi tiền cho <tên>".
                  const reason = `${isReceipt ? 'Thu tiền của ' : 'Chi tiền cho '}${p.name}`
                  setValue('reason', reason)
                  // Tự điền Diễn giải + Đối tượng/Tên đối tượng cho mọi dòng.
                  ;(watch('lines') ?? []).forEach((_, i) => {
                    setValue(`lines.${i}.description`, reason)
                    setValue(`lines.${i}.partnerId`, p.code)
                    setValue(`lines.${i}.partnerName`, p.name)
                  })
                }}
              />
            </Field>
            <Field label="Tên đối tượng">
              <input {...register('partnerName')} className={inputCls} />
            </Field>

            <Field label="Địa chỉ" className="col-span-2">
              <input {...register('address')} className={inputCls} />
            </Field>

            <Field
              label={isReceipt ? 'Nộp vào tài khoản' : 'Tài khoản chi'}
              error={formState.errors.bankAccountNo?.message}
            >
              <LookupInput {...register('bankAccountNo')} withAdd placeholder="Số TK ngân hàng" />
            </Field>
            <Field label="Tên ngân hàng">
              <input {...register('bankName')} className={inputCls} placeholder="Auto theo số TK" />
            </Field>

            {isReceipt ? (
              <>
                <Field label="Nhân viên thu nợ">
                  <LookupInput {...register('employeeId')} withAdd />
                </Field>
                <Field label="Lý do thu">
                  <input {...register('reason')} className={inputCls} />
                </Field>
              </>
            ) : (
              <>
                <Field label="Nội dung thanh toán">
                  <input {...register('reason')} className={inputCls} />
                </Field>
                <Field label="Nhân viên">
                  <LookupInput {...register('employeeId')} withAdd />
                </Field>
                <Field label="Tài khoản nhận" className="col-span-2">
                  <input {...register('receiverAccountNo')} className={inputCls} />
                </Field>
              </>
            )}

            <Field label="Tham chiếu" className="col-span-2">
              <input {...register('reference')} className={inputCls} />
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
                value={editing.data?.voucherNo ?? 'Tự động'}
                readOnly
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append(newLine())}
            >
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
              {saving ? 'Đang cất…' : 'Cất'}
            </Button>
            <Button type="button" onClick={submit(!voucherId)} disabled={saving}>
              {isReceipt ? 'Cất và In' : voucherId ? 'Cất' : 'Cất và Thêm'}
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

// Ô nhập có nút "+" (thêm nhanh) và mũi tên chọn — style theo MISA. Chưa nối lookup.
const LookupInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { withAdd?: boolean }
>(function LookupInput({ withAdd, className, ...props }, ref) {
  return (
    <div className="flex">
      <input
        ref={ref}
        {...props}
        className={cn(inputCls, 'rounded-r-none focus:ring-2', className)}
      />
      {withAdd && (
        <button
          type="button"
          tabIndex={-1}
          className="grid h-9 w-8 place-items-center border-y border-border bg-slate-50 text-primary hover:bg-slate-100"
          aria-label="Thêm nhanh"
        >
          <PlusIcon size={14} />
        </button>
      )}
      <button
        type="button"
        tabIndex={-1}
        className="grid h-9 w-8 place-items-center rounded-r-md border border-border bg-slate-50 text-slate-400 hover:bg-slate-100"
        aria-label="Chọn"
      >
        <ChevronDownIcon size={14} />
      </button>
    </div>
  )
})
