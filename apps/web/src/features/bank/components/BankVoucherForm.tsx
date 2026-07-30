import {
  BankPaymentMethod,
  BankVoucherCategory,
  BankVoucherType,
  CHART_OF_ACCOUNTS,
  PartnerType,
  type CreateBankVoucherInput,
} from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { forwardRef, useEffect, useState, type ReactNode } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { usePartnerOptions } from '@/shared/api/usePartnerOptions'
import { getApiErrorMessage } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { invalidToast } from '@/shared/lib/form'
import { AccountPicker, accountCellCls } from '@/shared/ui/account-picker'
import { Button } from '@/shared/ui/button'
import { ChevronDownIcon, PlusIcon } from '@/shared/ui/icons'
import { BankAccountPicker } from '@/shared/ui/bank-account-picker'
import { PartnerPicker, type PartnerOption } from '@/shared/ui/partner-picker'
import { QuickAddBankAccountDialog } from '@/shared/ui/quick-add-bank-account-dialog'
import { QuickAddPartnerDialog } from '@/shared/ui/quick-add-partner-dialog'
import { QuickAddEmployeeDialog } from '@/shared/ui/quick-add-employee-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useToast } from '@/shared/ui/toast'
import { cn } from '@/shared/lib/cn'
import { num } from '@/shared/lib/num'
import { useBankVoucher, useNextBankVoucherNo } from '../api/useBankVouchers'
import { useCreateBankVoucher, useUpdateBankVoucher } from '../api/useBankVoucherMutations'
import { bankVoucherSchema, type BankLineFormValues, type BankVoucherFormValues } from '../schema'
import { CATEGORY_LABEL, CATEGORY_OPTIONS, PAYMENT_METHOD_LABEL } from '../types'
import { AmountInput } from './AmountInput'

interface BankVoucherFormProps {
  type: BankVoucherType
  voucherId?: string | null
  // Tạo mới bằng cách nhân bản chứng từ này — điền sẵn dữ liệu, số chứng từ cấp lại khi Lưu.
  duplicateFromId?: string | null
  readOnly?: boolean
  // Nút hành động thêm ở thanh đáy khi xem (vd. Sửa nhanh / Ghi sổ) — page truyền vào.
  actions?: ReactNode
  onSaved: () => void
  onCancel: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

// Dòng mặc định — định khoản theo loại chứng từ (§8.3): Thu → Nợ 1121;
// Chi → Có 1121; Chuyển tiền nội bộ → cả 2 vế 1121.
function emptyLine(type: BankVoucherType): BankLineFormValues {
  switch (type) {
    case BankVoucherType.Receipt:
      return { amount: 0, debitAccount: CHART_OF_ACCOUNTS.BANK_DEPOSIT, creditAccount: '' }
    case BankVoucherType.Transfer:
      return {
        amount: 0,
        debitAccount: CHART_OF_ACCOUNTS.BANK_DEPOSIT,
        creditAccount: CHART_OF_ACCOUNTS.BANK_DEPOSIT,
      }
    default:
      return { amount: 0, debitAccount: '', creditAccount: CHART_OF_ACCOUNTS.BANK_DEPOSIT }
  }
}

const DEFAULT_CATEGORY: Record<BankVoucherType, BankVoucherCategory> = {
  [BankVoucherType.Receipt]: BankVoucherCategory.Receipt,
  [BankVoucherType.Payment]: BankVoucherCategory.Payment,
  [BankVoucherType.Transfer]: BankVoucherCategory.InternalTransfer,
}

function defaultValues(type: BankVoucherType): BankVoucherFormValues {
  const isReceipt = type === BankVoucherType.Receipt
  const isTransfer = type === BankVoucherType.Transfer
  return {
    type,
    category: DEFAULT_CATEGORY[type],
    paymentMethod: type === BankVoucherType.Payment ? BankPaymentMethod.UNC : undefined,
    isBatchTransfer: false,
    postingDate: today(),
    voucherDate: today(),
    bankAccountNo: '',
    partnerType: isTransfer ? undefined : isReceipt ? PartnerType.Customer : PartnerType.Supplier,
    reason: isTransfer ? '' : isReceipt ? 'Thu tiền của ' : 'Chi tiền cho ',
    lines: [emptyLine(type)],
  }
}

export function BankVoucherForm({
  type,
  voucherId,
  duplicateFromId,
  readOnly = false,
  actions,
  onSaved,
  onCancel,
}: BankVoucherFormProps) {
  const isReceipt = type === BankVoucherType.Receipt
  const isTransfer = type === BankVoucherType.Transfer
  // Nạp dữ liệu từ chứng từ đang sửa HOẶC chứng từ nguồn khi nhân bản.
  const duplicating = !voucherId && !!duplicateFromId
  const editing = useBankVoucher(voucherId ?? duplicateFromId ?? null)
  const create = useCreateBankVoucher()
  const update = useUpdateBankVoucher()
  const { toast } = useToast()

  const form = useForm<BankVoucherFormValues>({
    resolver: zodResolver(bankVoucherSchema),
    defaultValues: defaultValues(type),
  })
  const { control, register, handleSubmit, reset, watch, setValue, formState } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  // Preview số chứng từ kế tiếp khi tạo mới — số thật vẫn cấp lúc Lưu.
  const nextNo = useNextBankVoucherNo(type, watch('voucherDate'), !voucherId)

  // Picker "Mã đối tượng" (nguồn tạm: khách hàng + nhà cung cấp).
  const [partnerKw, setPartnerKw] = useState('')
  const { items: partnerItems, loading: partnerLoading } = usePartnerOptions(partnerKw)

  // Tạo nhanh đối tượng / nhân viên / TK ngân hàng (dialog mở từ nút + trên picker).
  const [partnerDialog, setPartnerDialog] = useState(false)
  const [employeeDialog, setEmployeeDialog] = useState(false)
  // null = đóng; mở thì giữ số TK gõ dở + picker nguồn (from = TK đi/chi, to = TK đến CTNB)
  // để onCreated điền đúng cặp field.
  const [bankAccountDialog, setBankAccountDialog] = useState<{
    keyword: string
    target: 'from' | 'to'
  } | null>(null)

  // CTNB: tự sinh Lý do chuyển + Diễn giải các dòng khi đã biết tên ngân hàng 2 đầu.
  const applyTransferReason = (fromBank?: string, toBank?: string) => {
    if (!isTransfer || !fromBank || !toBank) return
    const reason = `Chuyển tiền từ tài khoản ngân hàng ${fromBank} sang ngân hàng ${toBank}`
    setValue('reason', reason)
    ;(watch('lines') ?? []).forEach((_, i) => setValue(`lines.${i}.description`, reason))
  }

  // Chọn TKNH từ danh mục: điền số TK + tự điền Tên ngân hàng.
  const selectBankAccount = (a: { accountNumber: string; bankName: string }) => {
    setValue('bankAccountNo', a.accountNumber)
    setValue('bankName', a.bankName)
    applyTransferReason(a.bankName, watch('receiverBankName'))
  }

  // Tài khoản đến (chỉ CTNB): điền số TK nhận + tên ngân hàng nhận.
  const selectReceiverAccount = (a: { accountNumber: string; bankName: string }) => {
    setValue('receiverAccountNo', a.accountNumber)
    setValue('receiverBankName', a.bankName)
    applyTransferReason(watch('bankName'), a.bankName)
  }

  // Chọn đối tượng: điền header + tự điền Lý do/Diễn giải + Đối tượng cho mọi dòng.
  const selectPartner = (p: PartnerOption) => {
    setValue('partnerId', p.code)
    setValue('partnerName', p.name)
    setValue('partnerType', p.type)
    if (p.address) setValue('address', p.address)
    const reason = `${isReceipt ? 'Thu tiền của ' : 'Chi tiền cho '}${p.name}`
    setValue('reason', reason)
    ;(watch('lines') ?? []).forEach((_, i) => {
      setValue(`lines.${i}.description`, reason)
      setValue(`lines.${i}.partnerId`, p.code)
      setValue(`lines.${i}.partnerName`, p.name)
    })
  }

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
      // Chứng từ cũ có thể chưa lưu phương thức TT — UNC là mặc định của chi tiền gửi.
      paymentMethod:
        v.paymentMethod ?? (v.type === BankVoucherType.Payment ? BankPaymentMethod.UNC : undefined),
      isBatchTransfer: v.isBatchTransfer,
      internalRef: v.internalRef ?? undefined,
      // Nhân bản → ngày về hôm nay (chứng từ mới), sửa → giữ nguyên ngày gốc.
      postingDate: duplicating ? today() : v.postingDate.slice(0, 10),
      voucherDate: duplicating ? today() : v.voucherDate.slice(0, 10),
      bankAccountNo: v.bankAccountNo ?? '',
      bankName: v.bankName ?? undefined,
      receiverAccountNo: v.receiverAccountNo ?? undefined,
      receiverBankName: v.receiverBankName ?? undefined,
      partnerType: v.partnerType ?? undefined,
      partnerId: v.partnerId ?? undefined,
      partnerName: v.partnerName ?? undefined,
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
        partnerId: l.partnerId ?? undefined,
        partnerName: l.partnerName ?? undefined,
      })),
    })
  }, [editing.data, reset, duplicating])

  const lines = watch('lines')
  const total = lines?.reduce((s, l) => s + num(l.amount), 0) ?? 0

  const submit = (goNext: boolean) =>
    handleSubmit(
      async (values) => {
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
      try {
        if (voucherId) {
          // Sửa phiếu không cho đổi loại (type) — backend từ chối field thừa (forbidNonWhitelisted).
          const { type: _type, ...updateDto } = dto
          await update.mutateAsync({ id: voucherId, dto: updateDto })
        } else {
          await create.mutateAsync(dto)
        }
        if (goNext && !voucherId) {
          reset(defaultValues(type))
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
      },
      // Lỗi validate ở field không có chỗ hiện (vd. paymentMethod trong Select) → toast, tránh bấm Lưu không thấy gì.
      invalidToast(toast),
    )

  const saving = create.isPending || update.isPending

  return (
    <form className="flex h-full flex-col">
      <fieldset disabled={readOnly} className="flex-1 overflow-y-auto disabled:opacity-90">
        {/* Vùng thông tin chung — nền primary nhạt liền khối với page header (2 lớp màu, đồng bộ cash) */}
        <section className="space-y-3 bg-primary/5 px-6 pb-5 pt-2">
        {/* Loại nghiệp vụ + (thu) số UNC chi nhánh / (chi) phương thức TT.
            CTNB không có dropdown nghiệp vụ (loại đã thể hiện ở tiêu đề trang). */}
        {!isTransfer && (
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={watch('category')}
            onValueChange={(v) => setValue('category', v as BankVoucherCategory)}
          >
            <SelectTrigger className="h-9 w-auto min-w-[180px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS[type].map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Thu: tạm bỏ ô "Nhập số UNC từ chi nhánh khác chuyển đến" (internalRef vẫn giữ trong schema/DTO). */}
          {!isReceipt && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600">Phương thức thanh toán</label>
              <Select
                value={watch('paymentMethod')}
                onValueChange={(v) => setValue('paymentMethod', v as BankPaymentMethod)}
              >
                <SelectTrigger className="h-9 w-auto bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(BankPaymentMethod).map((m) => (
                    <SelectItem key={m} value={m}>
                      {PAYMENT_METHOD_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        )}

        {/* Chi: checkbox UNC theo lô ở hàng riêng dưới dropdown (MISA) */}
        {type === BankVoucherType.Payment && (
          <label className="flex w-fit items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" {...register('isBatchTransfer')} />
            Là UNC chuyển tiền theo lô
          </label>
        )}

        {/* Thông tin chung: cột trái (đối tượng/tài khoản) | cột phải (ngày) | tổng tiền */}
        <div className="flex flex-wrap gap-6">
          {/* Cột trái. CTNB: chỉ 2 đầu tài khoản + lý do chuyển (không có đối tượng). */}
          <div className="grid min-w-[520px] flex-1 grid-cols-2 gap-x-6 gap-y-3">
            {isTransfer ? (
              <>
                <Field label="Tài khoản đi" error={formState.errors.bankAccountNo?.message}>
                  <BankAccountPicker
                    value={watch('bankAccountNo')}
                    onSelect={selectBankAccount}
                    onAddNew={(kw) => setBankAccountDialog({ keyword: kw, target: 'from' })}
                  />
                </Field>
                <Field label="Tên ngân hàng">
                  <input {...register('bankName')} className={inputCls} placeholder="Tự điền theo số TK" />
                </Field>

                <Field label="Tài khoản đến" error={formState.errors.receiverAccountNo?.message}>
                  <BankAccountPicker
                    value={watch('receiverAccountNo')}
                    onSelect={selectReceiverAccount}
                    onAddNew={(kw) => setBankAccountDialog({ keyword: kw, target: 'to' })}
                  />
                </Field>
                <Field label="Tên ngân hàng">
                  <input
                    {...register('receiverBankName')}
                    className={inputCls}
                    placeholder="Tự điền theo số TK"
                  />
                </Field>

                <Field label="Lý do chuyển" className="col-span-2">
                  <input {...register('reason')} className={inputCls} />
                </Field>
              </>
            ) : (
              <>
                {/* Chi (MISA): Tài khoản chi đứng ĐẦU, trước Mã đối tượng. */}
                {!isReceipt && (
                  <>
                    <Field label="Tài khoản chi" error={formState.errors.bankAccountNo?.message}>
                      <BankAccountPicker
                        value={watch('bankAccountNo')}
                        onSelect={selectBankAccount}
                        onAddNew={(kw) => setBankAccountDialog({ keyword: kw, target: 'from' })}
                      />
                    </Field>
                    <Field label="Tên ngân hàng">
                      <input {...register('bankName')} className={inputCls} placeholder="Tự điền theo số TK" />
                    </Field>
                  </>
                )}

                <Field label="Mã đối tượng" error={formState.errors.partnerId?.message}>
                  <PartnerPicker
                    value={watch('partnerId')}
                    items={partnerItems}
                    loading={partnerLoading}
                    keyword={partnerKw}
                    onKeywordChange={setPartnerKw}
                    onSelect={selectPartner}
                    onAddNew={() => setPartnerDialog(true)}
                  />
                </Field>
                <Field label="Tên đối tượng">
                  <input {...register('partnerName')} className={inputCls} />
                </Field>

                <Field label="Địa chỉ" className="col-span-2">
                  <input {...register('address')} className={inputCls} />
                </Field>

                {isReceipt ? (
                  <>
                    <Field label="Nộp vào tài khoản" error={formState.errors.bankAccountNo?.message}>
                      <BankAccountPicker
                        value={watch('bankAccountNo')}
                        onSelect={selectBankAccount}
                        onAddNew={(kw) => setBankAccountDialog({ keyword: kw, target: 'from' })}
                      />
                    </Field>
                    <Field label="Tên ngân hàng">
                      <input {...register('bankName')} className={inputCls} placeholder="Tự điền theo số TK" />
                    </Field>

                    <Field label="Nhân viên thu nợ">
                      <LookupInput {...register('employeeId')} withAdd onAdd={() => setEmployeeDialog(true)} />
                    </Field>
                    <Field label="Lý do thu">
                      <input {...register('reason')} className={inputCls} />
                    </Field>
                  </>
                ) : (
                  <>
                    {/* Tài khoản nhận của đối tượng: số TK + tên ngân hàng nhận (MISA 2 ô cạnh nhau). */}
                    <Field label="Tài khoản nhận">
                      <input {...register('receiverAccountNo')} className={inputCls} />
                    </Field>
                    <Field label="Tên ngân hàng">
                      <input {...register('receiverBankName')} className={inputCls} />
                    </Field>

                    <Field label="Nhân viên">
                      <LookupInput {...register('employeeId')} withAdd onAdd={() => setEmployeeDialog(true)} />
                    </Field>
                    <Field label="Nội dung thanh toán">
                      <input {...register('reason')} className={inputCls} />
                    </Field>
                  </>
                )}
              </>
            )}

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
                value={editing.data?.voucherNo ?? nextNo.data ?? 'Tự động'}
                readOnly
                title="Số dự kiến — cấp chính thức khi Lưu"
                className={cn(inputCls, 'bg-slate-50 text-slate-500')}
              />
            </Field>
          </div>

          {/* Tổng tiền */}
          <div className="ml-auto text-right">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {isTransfer ? 'Tổng tiền thanh toán' : 'Tổng tiền'}
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
                    {/* CTNB không hạch toán theo đối tượng (MISA). */}
                    {!isTransfer && <th className="px-2 py-1.5">Đối&nbsp;tượng</th>}
                    {!isTransfer && <th className="px-2 py-1.5">Tên đối&nbsp;tượng</th>}
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
                          render={({ field, fieldState }) => (
                            <AmountInput
                              value={field.value}
                              onChange={field.onChange}
                              className={cn(
                                fieldState.error &&
                                  'border-red-400 focus:border-red-400 focus:ring-red-200',
                              )}
                            />
                          )}
                        />
                      </td>
                      {!isTransfer && (
                        <td className="px-2 py-1">
                          <input {...register(`lines.${i}.partnerId`)} className={cellCls} />
                        </td>
                      )}
                      {!isTransfer && (
                        <td className="px-2 py-1">
                          <input {...register(`lines.${i}.partnerName`)} className={cellCls} />
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
                    <td className="px-2 py-1.5" colSpan={4} />
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(total)}</td>
                    <td colSpan={isTransfer ? 1 : 3} />
                  </tr>
                </tfoot>
              </table>
          </div>

          {typeof formState.errors.lines?.message === 'string' && (
            <p className="text-sm text-red-600">{formState.errors.lines.message}</p>
          )}

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
        </section>
      </fieldset>

      {/* Thanh hành động — nền tối (đồng bộ với CashVoucherForm) */}
      <div className="flex h-14 shrink-0 items-center gap-2 bg-slate-900 px-6">
        <Button
          type="button"
          variant="outline"
          className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
          onClick={onCancel}
          disabled={saving}
        >
          {readOnly ? 'Đóng' : 'Hủy'}
        </Button>

        {readOnly && actions && <div className="ml-auto flex gap-2">{actions}</div>}

        {!readOnly && (
          <div className="ml-auto flex gap-2">
            {/* Sửa chứng từ đã có: chỉ 1 nút Lưu. Tạo mới: Lưu + nút gộp theo loại. */}
            {!voucherId && (
              <Button
                type="button"
                variant="outline"
                className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={submit(false)}
                disabled={saving}
              >
                {saving ? 'Đang lưu…' : 'Lưu'}
              </Button>
            )}
            <Button type="button" onClick={submit(!voucherId)} disabled={saving}>
              {voucherId
                ? saving
                  ? 'Đang lưu…'
                  : 'Lưu'
                : isReceipt
                  ? 'Lưu và In'
                  : 'Lưu và Thêm'}
            </Button>
          </div>
        )}
      </div>

      <QuickAddPartnerDialog
        open={partnerDialog}
        onClose={() => setPartnerDialog(false)}
        initialCode={partnerKw.trim() || undefined}
        onCreated={(p) => {
          setPartnerKw('')
          selectPartner(p)
        }}
      />
      <QuickAddEmployeeDialog
        open={employeeDialog}
        onClose={() => setEmployeeDialog(false)}
        initialCode={watch('employeeId') || undefined}
        onCreated={(p) => setValue('employeeId', p.code)}
      />
      <QuickAddBankAccountDialog
        open={bankAccountDialog !== null}
        onClose={() => setBankAccountDialog(null)}
        initialAccountNumber={bankAccountDialog?.keyword || undefined}
        onCreated={bankAccountDialog?.target === 'to' ? selectReceiverAccount : selectBankAccount}
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

// Ô nhập có nút "+" (thêm nhanh) và mũi tên chọn — style theo MISA. Chưa nối lookup.
const LookupInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { withAdd?: boolean; onAdd?: () => void }
>(function LookupInput({ withAdd, onAdd, className, ...props }, ref) {
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
          onClick={onAdd}
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
