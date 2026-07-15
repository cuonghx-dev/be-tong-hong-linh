import {
  CASH_PAYMENT_DEBIT_ACCOUNT,
  CASH_RECEIPT_CREDIT_ACCOUNT,
  CashVoucherCategory,
  CashVoucherType,
  CHART_OF_ACCOUNTS,
  PartnerType,
  type CreateCashVoucherInput,
} from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState, type ReactNode } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { getApiErrorMessage } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import { PlusIcon, TrashIcon } from '@/shared/ui/icons'
import { PartnerPicker, type PartnerOption } from '@/shared/ui/partner-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useToast } from '@/shared/ui/toast'
import { cn } from '@/shared/lib/cn'
import { useCashVoucher, useNextCashVoucherNo } from '../api/useCashVouchers'
import {
  useCreateCashVoucher,
  useUpdateCashVoucher,
} from '../api/useCashVoucherMutations'
import { useEmployeeOptions } from '@/shared/api/useEmployeeOptions'
import { usePartnerOptions } from '@/shared/api/usePartnerOptions'
import { cashVoucherSchema, type CashLineFormValues, type CashVoucherFormValues } from '../schema'
import { CATEGORY_LABEL, CATEGORY_OPTIONS, defaultReason, lineColumns } from '../types'
import { AmountInput } from './AmountInput'
import { QuickAddPartnerDialog } from '@/shared/ui/quick-add-partner-dialog'
import { QuickAddEmployeeDialog } from '@/shared/ui/quick-add-employee-dialog'

interface CashVoucherPrefill {
  category?: CashVoucherCategory
  partnerId?: string
  partnerName?: string
  // Số tiền điền sẵn cho dòng hạch toán đầu (vd. "Trả tiền" từ chứng từ mua hàng).
  amount?: number
}

interface CashVoucherFormProps {
  type: CashVoucherType
  voucherId?: string | null
  // Tạo mới bằng cách nhân bản phiếu này — điền sẵn dữ liệu, số phiếu cấp lại khi Lưu.
  duplicateFromId?: string | null
  readOnly?: boolean
  prefill?: CashVoucherPrefill
  // Nút hành động thêm ở thanh đáy khi xem (vd. Sửa nhanh / Ghi sổ) — page truyền vào.
  actions?: ReactNode
  onSaved: () => void
  onCancel: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

// Dòng mặc định — định khoản theo loại nghiệp vụ (§8.3, map dùng chung ở @app/shared).
function emptyLine(category: CashVoucherCategory, type: CashVoucherType): CashLineFormValues {
  return type === CashVoucherType.Receipt
    ? { amount: 0, debitAccount: CHART_OF_ACCOUNTS.CASH_ON_HAND, creditAccount: CASH_RECEIPT_CREDIT_ACCOUNT[category] ?? '' }
    : { amount: 0, debitAccount: CASH_PAYMENT_DEBIT_ACCOUNT[category] ?? '', creditAccount: CHART_OF_ACCOUNTS.CASH_ON_HAND }
}

function defaultValues(type: CashVoucherType, prefill?: CashVoucherPrefill): CashVoucherFormValues {
  const fallback = type === CashVoucherType.Receipt ? CashVoucherCategory.Receipt : CashVoucherCategory.Payment
  const category = prefill?.category ?? fallback
  const reason = defaultReason(category, prefill?.partnerName)
  return {
    type,
    category,
    postingDate: today(),
    voucherDate: today(),
    partnerType: PartnerType.Customer,
    partnerId: prefill?.partnerId,
    partnerName: prefill?.partnerName,
    reason,
    // Dòng hạch toán đầu tiên kế thừa Diễn giải từ Lý do nộp/chi (MISA tự điền).
    lines: [{ ...emptyLine(category, type), amount: prefill?.amount ?? 0, description: reason, partnerId: prefill?.partnerId, partnerName: prefill?.partnerName }],
  }
}

export function CashVoucherForm({ type, voucherId, duplicateFromId, readOnly = false, prefill, actions, onSaved, onCancel }: CashVoucherFormProps) {
  const isReceipt = type === CashVoucherType.Receipt
  // Nạp dữ liệu từ phiếu đang sửa HOẶC phiếu nguồn khi nhân bản.
  const duplicating = !voucherId && !!duplicateFromId
  const editing = useCashVoucher(voucherId ?? duplicateFromId ?? null)
  const create = useCreateCashVoucher()
  const update = useUpdateCashVoucher()
  const { toast } = useToast()

  const form = useForm<CashVoucherFormValues>({
    resolver: zodResolver(cashVoucherSchema),
    defaultValues: defaultValues(type, prefill),
  })
  const { control, register, handleSubmit, reset, watch, setValue, formState } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  // Picker "Mã đối tượng" (nguồn tạm: khách hàng + nhà cung cấp).
  const [partnerKw, setPartnerKw] = useState('')
  const { items: partnerItems, loading: partnerLoading } = usePartnerOptions(partnerKw)

  // Picker "Nhân viên" (danh mục Nhân viên đang sử dụng).
  const [employeeKw, setEmployeeKw] = useState('')
  const { items: employeeItems, loading: employeeLoading } = useEmployeeOptions(employeeKw)

  // Tạo nhanh đối tượng / nhân viên (dialog mở từ nút + trên picker).
  const [partnerDialog, setPartnerDialog] = useState(false)
  const [employeeDialog, setEmployeeDialog] = useState(false)

  // Chọn đối tượng: điền header + tự điền Lý do/Diễn giải + Đối tượng cho mọi dòng.
  const selectPartner = (p: PartnerOption) => {
    setValue('partnerId', p.code)
    setValue('partnerName', p.name)
    setValue('partnerType', p.type)
    if (p.address) setValue('address', p.address)
    const reason = defaultReason(watch('category'), p.name)
    setValue('reason', reason)
    ;(watch('lines') ?? []).forEach((_, i) => {
      setValue(`lines.${i}.description`, reason)
      setValue(`lines.${i}.partnerId`, p.code)
      setValue(`lines.${i}.partnerName`, p.name)
    })
  }

  const selectEmployee = (p: PartnerOption) => setValue('employeeId', p.code)

  // Nạp dữ liệu khi sửa.
  useEffect(() => {
    const v = editing.data
    if (!v) return
    reset({
      type: v.type,
      category: v.category,
      // Nhân bản → ngày về hôm nay (phiếu mới), sửa → giữ nguyên ngày gốc.
      postingDate: duplicating ? today() : v.postingDate.slice(0, 10),
      voucherDate: duplicating ? today() : v.voucherDate.slice(0, 10),
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
  }, [editing.data, reset, duplicating])

  const category = watch('category')
  const lines = watch('lines')
  const cols = lineColumns(category)

  // Preview số phiếu kế tiếp khi tạo mới (PT####/YYYY) — số thật vẫn cấp lúc Lưu.
  const voucherDate = watch('voucherDate')
  const nextNo = useNextCashVoucherNo(type, voucherDate, !voucherId)

  // Dòng mới kế thừa Đối tượng/Tên đối tượng từ header (MISA tự điền).
  const newLine = (): CashLineFormValues => ({
    ...emptyLine(category, type),
    description: watch('reason'),
    partnerId: watch('partnerId'),
    partnerName: watch('partnerName'),
  })
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
      try {
        if (voucherId) {
          await update.mutateAsync({ id: voucherId, dto })
        } else {
          await create.mutateAsync(dto)
        }
        if (goNext && !voucherId) {
          reset(defaultValues(type, prefill))
        } else {
          onSaved()
        }
      } catch (e) {
        toast({ variant: 'error', title: 'Lưu chứng từ thất bại', description: getApiErrorMessage(e) })
      }
    })

  const saving = create.isPending || update.isPending
  const colSpan = 4 + (cols.showPartner ? 2 : 0) + (cols.showCostItem ? 1 : 0) + (cols.showBank ? 2 : 0)

  return (
    <form className="flex h-full flex-col">
      <fieldset disabled={readOnly} className="flex-1 overflow-y-auto disabled:opacity-90">
        {/* Vùng thông tin chung — nền primary nhạt liền khối với page header (layout kiểu MISA) */}
        <section className="space-y-3 bg-primary/5 px-4 pb-4 pt-1">
          {/* Loại nghiệp vụ */}
          <Select
            value={watch('category')}
            onValueChange={(v) => {
              const next = v as CashVoucherCategory
              setValue('category', next)
              // Đổi loại nghiệp vụ → reset định khoản mặc định dòng đầu.
              setValue('lines.0.debitAccount', emptyLine(next, type).debitAccount)
              setValue('lines.0.creditAccount', emptyLine(next, type).creditAccount)
              // + cập nhật Lý do nộp/chi và Diễn giải các dòng theo loại mới.
              const reason = defaultReason(next, watch('partnerName'))
              setValue('reason', reason)
              ;(watch('lines') ?? []).forEach((_, i) => {
                setValue(`lines.${i}.description`, reason)
              })
            }}
          >
            <SelectTrigger className="h-9 w-auto min-w-[240px] border-slate-300 bg-white transition-colors hover:border-primary/50 focus:ring-primary/30">
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

          {/* Lưới trường (trái) | cột ngày + số phiếu | Tổng tiền (phải) */}
          <div className="flex flex-wrap gap-x-10 gap-y-3">
            {/* Cột trái */}
            <div className="grid min-w-0 flex-1 basis-[520px] grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="Mã đối tượng">
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

            {isReceipt ? (
              <>
                <Field label="Người nộp">
                  <input {...register('payerReceiver')} className={inputCls} />
                </Field>
                <Field label="Địa chỉ">
                  <input {...register('address')} className={inputCls} />
                </Field>
                <Field label="Lý do nộp" className="sm:col-span-2">
                  <input {...register('reason')} className={inputCls} />
                </Field>
                <Field label="Nhân viên">
                  <PartnerPicker
                    value={watch('employeeId')}
                    items={employeeItems}
                    loading={employeeLoading}
                    keyword={employeeKw}
                    onKeywordChange={setEmployeeKw}
                    placeholder="Mã nhân viên"
                    onSelect={selectEmployee}
                    onAddNew={() => setEmployeeDialog(true)}
                  />
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
                {/* PC: Lý do chi nằm TRÊN Nhân viên (§4), trải rộng 2 cột như MISA */}
                <Field label="Lý do chi" className="sm:col-span-2">
                  <input {...register('reason')} className={inputCls} />
                </Field>
                <Field label="Nhân viên">
                  <PartnerPicker
                    value={watch('employeeId')}
                    items={employeeItems}
                    loading={employeeLoading}
                    keyword={employeeKw}
                    onKeywordChange={setEmployeeKw}
                    placeholder="Mã nhân viên"
                    onSelect={selectEmployee}
                    onAddNew={() => setEmployeeDialog(true)}
                  />
                </Field>
              </>
            )}

            <Field label="Kèm theo">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Số lượng"
                  {...register('attachmentCount')}
                  className={cn(inputCls, 'w-32')}
                />
                <span className="text-sm text-slate-500">chứng từ gốc</span>
              </div>
            </Field>
            </div>

            {/* Cột phải: ngày + số phiếu */}
            <div className="w-56 space-y-3">
              <Field label="Ngày hạch toán" required error={formState.errors.postingDate?.message}>
                <input type="date" {...register('postingDate')} className={inputCls} />
              </Field>
              <Field label="Ngày phiếu" required error={formState.errors.voucherDate?.message}>
                <input type="date" {...register('voucherDate')} className={inputCls} />
              </Field>
              <Field label={`Số phiếu ${isReceipt ? 'thu' : 'chi'}`}>
                <input
                  value={editing.data?.voucherNo ?? nextNo.data ?? 'Tự động'}
                  readOnly
                  title="Số dự kiến — cấp chính thức khi Lưu"
                  className={cn(inputCls, 'bg-slate-50 text-slate-500 hover:border-slate-300')}
                />
              </Field>
            </div>

            {/* Tổng tiền — góc phải vùng đầu trang, realtime theo dòng hạch toán */}
            <div className="ml-auto text-right">
              <div className="text-sm font-semibold text-slate-800">Tổng tiền</div>
              <div className="mt-1 text-4xl font-bold tabular-nums text-slate-900">
                {formatCurrency(total)}
              </div>
            </div>
          </div>

          {/* Tham chiếu — chứng từ nguồn liên quan (placeholder, chưa liên kết) */}
          <div className="flex items-center gap-1 text-[13px] text-slate-500">
            <span className="font-semibold text-slate-700">Tham chiếu</span>
            <span className="text-slate-400">…</span>
          </div>
        </section>

        {/* Bảng hạch toán — nền trắng */}
        <section className="space-y-2 px-4 py-4">
          <h2 className="text-base font-semibold text-slate-800">Hạch toán</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-100 text-left text-[13px] text-slate-700">
                  <tr>
                    <th className="w-8 px-2 py-2 text-center font-semibold">#</th>
                    <th className="min-w-[200px] px-2 py-2 font-semibold">Diễn&nbsp;giải</th>
                    <th className="w-24 px-2 py-2 font-semibold">TK Nợ</th>
                    <th className="w-24 px-2 py-2 font-semibold">TK Có</th>
                    <th className="w-36 px-2 py-2 text-right font-semibold">Số&nbsp;tiền</th>
                    <th className="px-2 py-2 font-semibold">Nghiệp&nbsp;vụ</th>
                    {cols.showPartner && <th className="px-2 py-2 font-semibold">Đối&nbsp;tượng</th>}
                    {cols.showPartner && <th className="min-w-[160px] px-2 py-2 font-semibold">Tên đối&nbsp;tượng</th>}
                    {cols.showCostItem && <th className="px-2 py-2 font-semibold">Khoản&nbsp;mục CP</th>}
                    {cols.showBank && <th className="px-2 py-2 font-semibold">TK ngân&nbsp;hàng</th>}
                    {cols.showBank && <th className="px-2 py-2 font-semibold">Tên ngân&nbsp;hàng</th>}
                    <th className="w-10 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {fields.map((f, i) => (
                    <tr
                      key={f.id}
                      className="group border-t border-border/70 transition-colors hover:bg-slate-50/60 focus-within:bg-primary/[0.04]"
                    >
                      <td className="px-2 py-1 text-center text-xs tabular-nums text-slate-400">{i + 1}</td>
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
                          render={({ field, fieldState }) => (
                            <AmountInput
                              value={field.value}
                              onChange={field.onChange}
                              className={cn(
                                cellCls,
                                'text-right font-medium',
                                fieldState.error && 'border-red-400 focus:border-red-400 focus:ring-red-200',
                              )}
                            />
                          )}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input {...register(`lines.${i}.operation`)} className={cellCls} />
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
                          onClick={() => remove(i)}
                          disabled={fields.length <= 1}
                          className="grid h-7 w-7 place-items-center rounded-md text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:pointer-events-none disabled:opacity-40"
                          aria-label="Xóa dòng"
                        >
                          <TrashIcon size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-semibold text-slate-800">
                  <tr className="border-t border-border">
                    <td colSpan={4} />
                    <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(total)}</td>
                    <td colSpan={Math.max(colSpan - 3, 1)} />
                  </tr>
                </tfoot>
              </table>
          </div>

          <p className="text-sm text-slate-600">
            Tổng số: <b className="font-semibold text-slate-800">{fields.length}</b> bản ghi
          </p>

          <div className="flex items-center gap-2">
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

          {typeof formState.errors.lines?.message === 'string' && (
            <p className="text-sm text-red-600">{formState.errors.lines.message}</p>
          )}
        </section>
      </fieldset>

      {/* Thanh hành động — nền tối (cùng tông action bar khai báo số dư đầu kỳ) */}
      <div className="flex h-14 shrink-0 items-center gap-2 bg-slate-900 px-4">
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
            {/* Sửa phiếu đã có: chỉ 1 nút Lưu. Tạo mới: Lưu + nút gộp theo loại. */}
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
                  ? 'Lưu và Thêm'
                  : 'Lưu và In'}
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
        initialCode={employeeKw.trim() || undefined}
        onCreated={(p) => {
          setEmployeeKw('')
          selectEmployee(p)
        }}
      />
    </form>
  )
}

// ── Local UI bits ─────────────────────────────────────────────────────────
const inputCls =
  'h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm transition-colors hover:border-primary/50 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20'
// Ô nhập trong bảng: kiểu spreadsheet — viền ẩn, hiện khi hover/focus.
const cellCls =
  'h-8 w-full rounded border border-transparent bg-transparent px-2 text-sm transition-colors hover:border-slate-200 focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/20'

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-[13px] font-semibold text-slate-800">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
