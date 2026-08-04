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
import { Controller, useFieldArray, useForm, type UseFormRegister } from 'react-hook-form'
import { getApiErrorMessage } from '@/shared/lib/api'
import { invalidToast } from '@/shared/lib/form'
import { formatCurrency } from '@/shared/lib/currency'
import { AccountPicker, accountCellCls } from '@/shared/ui/account-picker'
import { Button } from '@/shared/ui/button'
import { PlusIcon, TrashIcon } from '@/shared/ui/icons'
import { PartnerPicker, type PartnerOption } from '@/shared/ui/partner-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { useToast } from '@/shared/ui/toast'
import { cn } from '@/shared/lib/cn'
import { num } from '@/shared/lib/num'
import { useEmployeeOptions } from '@/shared/api/useEmployeeOptions'
import { usePartnerOptions } from '@/shared/api/usePartnerOptions'
import { AmountInput } from '@/shared/ui/amount-input'
import { QuickAddPartnerDialog } from '@/shared/ui/quick-add-partner-dialog'
import { QuickAddEmployeeDialog } from '@/shared/ui/quick-add-employee-dialog'
import { Input } from '@/shared/ui/input'
import { Field } from '@/shared/ui/field'
import { Checkbox } from '@/shared/ui/checkbox'
import { CellInput, cellInputCls } from '@/shared/ui/cell-input'
import { useCashVoucher, useNextCashVoucherNo } from '../api/useCashVouchers'
import { useCreateCashVoucher, useUpdateCashVoucher } from '../api/useCashVoucherMutations'
import {
  cashVoucherSchema,
  type CashLineFormValues,
  type CashTaxLineFormValues,
  type CashVoucherFormValues,
} from '../schema'
import {
  CATEGORY_LABEL,
  CATEGORY_OPTIONS,
  defaultReason,
  headerConfig,
  lineColumns,
} from '../types'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { RecordFormSkeleton } from '@/shared/ui/record-skeleton'

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

// Mã đối tượng mặc định cho phiếu thu có tên đối tượng nhưng chưa có trong danh mục (khách lẻ).
const WALK_IN_PARTNER_CODE = 'KHACH LE'

// Loại nghiệp vụ ngoài danh sách chọn tay (mua hàng… tự sinh) →
// quy về mặc định "Thu khác" / "Chi khác" khi hiển thị và lưu phiếu.
function normalizeCategory(
  type: CashVoucherType,
  category?: CashVoucherCategory,
): CashVoucherCategory {
  const fallback =
    type === CashVoucherType.Receipt ? CashVoucherCategory.Receipt : CashVoucherCategory.Payment
  return category && CATEGORY_OPTIONS[type].includes(category) ? category : fallback
}

// Dòng mặc định — định khoản theo loại nghiệp vụ (§8.3, map dùng chung ở @app/shared).
// Riêng "Chi khác" MISA để TK Nợ trống cho tự nhập — map vẫn giữ 811 làm
// fallback khi nhập khẩu Excel (dòng import không được rỗng TK đối ứng).
function emptyLine(category: CashVoucherCategory, type: CashVoucherType): CashLineFormValues {
  if (type === CashVoucherType.Receipt) {
    return {
      amount: 0,
      debitAccount: CHART_OF_ACCOUNTS.CASH_ON_HAND,
      creditAccount: CASH_RECEIPT_CREDIT_ACCOUNT[category] ?? '',
    }
  }
  const debitAccount =
    category === CashVoucherCategory.Payment ? '' : (CASH_PAYMENT_DEBIT_ACCOUNT[category] ?? '')
  return { amount: 0, debitAccount, creditAccount: CHART_OF_ACCOUNTS.CASH_ON_HAND }
}

// Dòng thuế GTGT mặc định (tab thuế): Có hóa đơn, 10%, TK 1331, ngày HĐ = ngày phiếu.
function defaultTaxLine(reason: string | undefined, invoiceDate: string): CashTaxLineFormValues {
  return {
    description: reason ? `Thuế GTGT - ${reason}` : 'Thuế GTGT',
    hasInvoice: true,
    vatRate: 10,
    amount: 0,
    vatAccount: CHART_OF_ACCOUNTS.VAT_INPUT_DEDUCTIBLE,
    invoiceDate,
  }
}

function defaultValues(type: CashVoucherType, prefill?: CashVoucherPrefill): CashVoucherFormValues {
  const category = normalizeCategory(type, prefill?.category)
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
    lines: [
      {
        ...emptyLine(category, type),
        amount: prefill?.amount ?? 0,
        description: reason,
        partnerId: prefill?.partnerId,
        partnerName: prefill?.partnerName,
      },
    ],
    // Chi mua ngoài có hóa đơn: mở sẵn 1 dòng kê khai thuế.
    taxLines:
      category === CashVoucherCategory.PaymentPurchaseWithInvoice
        ? [defaultTaxLine(reason, today())]
        : [],
  }
}

export function CashVoucherForm({
  type,
  voucherId,
  duplicateFromId,
  readOnly = false,
  prefill,
  actions,
  onSaved,
  onCancel,
}: CashVoucherFormProps) {
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
  const taxArray = useFieldArray({ control, name: 'taxLines' })

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
    // Đối tượng là nhân viên → đồng bộ luôn trường Nhân viên.
    if (p.type === PartnerType.Employee) setValue('employeeId', p.code)
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
    // Phiếu thu có tên đối tượng nhưng chưa có mã (khách lẻ, dữ liệu nhập khẩu) → mã "KHACH LE".
    const walkIn = v.type === CashVoucherType.Receipt && !v.partnerId && !!v.partnerName
    reset({
      type: v.type,
      category: normalizeCategory(v.type, v.category),
      // Nhân bản → ngày về hôm nay (phiếu mới), sửa → giữ nguyên ngày gốc.
      postingDate: duplicating ? today() : v.postingDate.slice(0, 10),
      voucherDate: duplicating ? today() : v.voucherDate.slice(0, 10),
      partnerType: walkIn ? PartnerType.Customer : (v.partnerType ?? undefined),
      partnerId: walkIn ? WALK_IN_PARTNER_CODE : (v.partnerId ?? undefined),
      partnerName: v.partnerName ?? undefined,
      payerReceiver: v.payerReceiver ?? undefined,
      address: v.address ?? undefined,
      employeeId: v.employeeId ?? undefined,
      reason: v.reason ?? undefined,
      attachmentCount: v.attachmentCount,
      branchId: v.branchId ?? undefined,
      // Dòng thuế GTGT (isVatLine) tách sang tab "Kê khai hóa đơn và hạch toán thuế".
      lines: v.lines
        .filter((l) => !l.isVatLine)
        .map((l) => ({
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
      taxLines: v.lines
        .filter((l) => l.isVatLine)
        .map((l) => ({
          description: l.description ?? undefined,
          hasInvoice: l.hasInvoice ?? undefined,
          vatRate: l.vatRate != null ? Number(l.vatRate) : undefined,
          amount: Number(l.amount),
          vatAccount: l.debitAccount,
          invoiceDate: l.invoiceDate ?? undefined,
          invoiceNo: l.invoiceNo ?? undefined,
          goodsServiceGroup: l.goodsServiceGroup ?? undefined,
          partnerId: l.partnerId ?? undefined,
          partnerName: l.partnerName ?? undefined,
          supplierTaxCode: l.supplierTaxCode ?? undefined,
        })),
    })
  }, [editing.data, reset, duplicating])

  const category = watch('category')
  const lines = watch('lines')
  const taxLines = watch('taxLines')
  const cols = lineColumns(category)
  const header = headerConfig(category)

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
  const linesTotal = lines?.reduce((s, l) => s + num(l.amount), 0) ?? 0
  const taxTotal = taxLines?.reduce((s, l) => s + num(l.amount), 0) ?? 0
  // Tổng tiền = tiền hàng (hạch toán) + thuế GTGT (tab thuế).
  const total = linesTotal + taxTotal

  const submit = (goNext: boolean) =>
    handleSubmit(async (values) => {
      // Phiếu thu nhập tên đối tượng mà không chọn mã → mặc định mã "KHACH LE".
      const walkIn = isReceipt && !values.partnerId && !!values.partnerName
      // Dòng thuế GTGT (chỉ Chi mua ngoài có hóa đơn) → bút toán Nợ TK thuế / Có 1111;
      // dòng 0 đồng bị loại (backend chặn amount ≤ 0).
      const vatLineDtos =
        values.category === CashVoucherCategory.PaymentPurchaseWithInvoice
          ? (values.taxLines ?? [])
              .filter((t) => t.amount > 0)
              .map((t) => ({
                description: t.description,
                debitAccount: t.vatAccount,
                creditAccount: CHART_OF_ACCOUNTS.CASH_ON_HAND,
                amount: t.amount,
                isVatLine: true,
                hasInvoice: t.hasInvoice ?? true,
                vatRate: t.vatRate,
                invoiceDate: t.invoiceDate || undefined,
                invoiceNo: t.invoiceNo || undefined,
                goodsServiceGroup: t.goodsServiceGroup || undefined,
                partnerId: t.partnerId || undefined,
                partnerName: t.partnerName || undefined,
                supplierTaxCode: t.supplierTaxCode || undefined,
              }))
          : []
      // taxLines là field FE — không gửi lên API (forbidNonWhitelisted).
      const { taxLines: _taxLines, ...rest } = values
      const dto: CreateCashVoucherInput = {
        ...rest,
        partnerId: walkIn ? WALK_IN_PARTNER_CODE : values.partnerId,
        partnerType: walkIn ? PartnerType.Customer : values.partnerType,
        lines: [
          ...values.lines.map((l) => ({
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
          ...vatLineDtos,
        ],
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
          reset(defaultValues(type, prefill))
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
  const colSpan =
    4 + (cols.showPartner ? 2 : 0) + (cols.showCostItem ? 1 : 0) + (cols.showBank ? 2 : 0)

  // Chờ nạp chứng từ — tránh chớp form rỗng rồi mới điền dữ liệu.
  if (editing.isLoading) return <RecordFormSkeleton />

  return (
    <form className="flex h-full flex-col">
      <fieldset disabled={readOnly} className="flex-1 overflow-y-auto disabled:opacity-90">
        {/* Vùng thông tin chung — nền primary nhạt liền khối với page header (layout kiểu MISA) */}
        <section className="space-y-3 bg-primary/5 px-6 pb-5 pt-2">
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
              // Chi mua ngoài có hóa đơn → mở sẵn 1 dòng kê khai thuế; loại khác → bỏ bảng thuế.
              if (next === CashVoucherCategory.PaymentPurchaseWithInvoice) {
                if ((watch('taxLines') ?? []).length === 0) {
                  setValue('taxLines', [defaultTaxLine(reason, watch('voucherDate'))])
                }
              } else {
                setValue('taxLines', [])
              }
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
                <Input {...register('partnerName')} />
              </Field>

              {isReceipt ? (
                <>
                  <Field label="Người nộp">
                    <Input {...register('payerReceiver')} />
                  </Field>
                  <Field label="Địa chỉ">
                    <Input {...register('address')} />
                  </Field>
                  <Field label="Lý do nộp" className="sm:col-span-2">
                    <Input {...register('reason')} />
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
                    <Input {...register('payerReceiver')} />
                  </Field>
                  <Field label="Địa chỉ">
                    <Input {...register('address')} />
                  </Field>
                  {/* PC: Lý do chi (rộng) + Kèm theo (hẹp) trên cùng 1 hàng (theo form MISA) */}
                  <div className="flex flex-wrap items-start gap-x-6 gap-y-3 sm:col-span-2">
                    <Field label="Lý do chi" className="min-w-[240px] flex-1">
                      <Input {...register('reason')} />
                    </Field>
                    <AttachmentField register={register} />
                  </div>
                  {/* Gửi tiền vào NH: MISA không có trường Nhân viên riêng */}
                  {header.showEmployee && (
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
                  )}
                </>
              )}

              {/* PT: Kèm theo nằm sau Nhân viên như cũ */}
              {isReceipt && <AttachmentField register={register} />}
            </div>

            {/* Cột phải: ngày + số phiếu */}
            <div className="w-56 space-y-3">
              <Field label="Ngày hạch toán" required error={formState.errors.postingDate?.message}>
                <Input type="date" {...register('postingDate')} />
              </Field>
              <Field label="Ngày phiếu" required error={formState.errors.voucherDate?.message}>
                <Input type="date" {...register('voucherDate')} />
              </Field>
              <Field label={`Số phiếu ${isReceipt ? 'thu' : 'chi'}`}>
                <Input
                  value={editing.data?.voucherNo ?? nextNo.data ?? 'Tự động'}
                  readOnly
                  title="Số dự kiến — cấp chính thức khi Lưu"
                  className="bg-slate-50 text-slate-500 hover:border-slate-300"
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
        </section>

        {/* Bảng hạch toán — nền trắng */}
        <section className="space-y-2 px-6 py-5">
          {/* Chi mua ngoài có hóa đơn có thêm bảng kê khai thuế: 2 bảng hiển thị cùng lúc
              (không ẩn theo tab) để luôn thấy dòng hạch toán khi nhập kê khai thuế. */}
          <h2 className="text-base font-semibold text-slate-800">Hạch toán</h2>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader className="bg-slate-100 text-[13px] text-slate-700">
                <TableRow>
                  <TableHead className="w-8 px-2 text-center">#</TableHead>
                  <TableHead className="min-w-[200px] px-2">Diễn&nbsp;giải</TableHead>
                  <TableHead className="w-24 px-2">TK Nợ</TableHead>
                  <TableHead className="w-24 px-2">TK Có</TableHead>
                  <TableHead className="w-36 px-2 text-right">Số&nbsp;tiền</TableHead>
                  <TableHead className="px-2">Nghiệp&nbsp;vụ</TableHead>
                  {cols.showPartner && <TableHead className="px-2">Đối tượng</TableHead>}
                  {cols.showPartner && (
                    <TableHead className="min-w-[160px] px-2">Tên đối tượng</TableHead>
                  )}
                  {cols.showCostItem && <TableHead className="px-2">Khoản&nbsp;mục CP</TableHead>}
                  {cols.showBank && <TableHead className="px-2">TK ngân&nbsp;hàng</TableHead>}
                  {cols.showBank && <TableHead className="px-2">Tên ngân&nbsp;hàng</TableHead>}
                  <TableHead className="w-10 px-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((f, i) => (
                  <TableRow
                    key={f.id}
                    className="group border-border/70 hover:bg-slate-50/60 focus-within:bg-primary/[0.04]"
                  >
                    <TableCell className="px-2 py-1 text-center text-xs tabular-nums text-slate-400">
                      {i + 1}
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <CellInput {...register(`lines.${i}.description`)} />
                    </TableCell>
                    <TableCell className="px-2 py-1">
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
                    </TableCell>
                    <TableCell className="px-2 py-1">
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
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <Controller
                        control={control}
                        name={`lines.${i}.amount`}
                        render={({ field, fieldState }) => (
                          <AmountInput
                            value={field.value}
                            onChange={field.onChange}
                            className={cn(
                              cellInputCls,
                              'text-right font-medium',
                              fieldState.error &&
                                'border-red-400 focus:border-red-400 focus:ring-red-200',
                            )}
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <CellInput {...register(`lines.${i}.operation`)} />
                    </TableCell>
                    {cols.showPartner && (
                      <TableCell className="px-2 py-1">
                        <CellInput {...register(`lines.${i}.partnerId`)} />
                      </TableCell>
                    )}
                    {cols.showPartner && (
                      <TableCell className="px-2 py-1">
                        <CellInput {...register(`lines.${i}.partnerName`)} />
                      </TableCell>
                    )}
                    {cols.showCostItem && (
                      <TableCell className="px-2 py-1">
                        <CellInput {...register(`lines.${i}.costItemId`)} />
                      </TableCell>
                    )}
                    {cols.showBank && (
                      <TableCell className="px-2 py-1">
                        <CellInput {...register(`lines.${i}.bankAccountNo`)} />
                      </TableCell>
                    )}
                    {cols.showBank && (
                      <TableCell className="px-2 py-1">
                        <CellInput {...register(`lines.${i}.bankName`)} />
                      </TableCell>
                    )}
                    <TableCell className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        disabled={fields.length <= 1}
                        className="grid h-7 w-7 place-items-center rounded-md text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:pointer-events-none disabled:opacity-40"
                        aria-label="Xóa dòng"
                      >
                        <TrashIcon size={15} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-slate-100 font-semibold text-slate-800">
                <TableRow>
                  <TableCell colSpan={4} />
                  <TableCell className="px-4 text-right tabular-nums">
                    {formatCurrency(linesTotal)}
                  </TableCell>
                  <TableCell colSpan={Math.max(colSpan - 3, 1)} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          <p className="text-sm text-slate-600">
            Tổng số: <b className="font-semibold text-slate-800">{fields.length}</b> bản ghi
          </p>

          <div className="flex items-center gap-2">
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

          {/* Kê khai hóa đơn và hạch toán thuế — chỉ Chi mua ngoài có hóa đơn */}
          {header.showVatTab && (
            <>
              <h2 className="pt-2 text-base font-semibold text-slate-800">
                Kê khai hóa đơn và hạch toán thuế
              </h2>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader className="bg-slate-100 text-[13px] text-slate-700">
                    <TableRow>
                      <TableHead className="w-8 px-2 text-center">#</TableHead>
                      <TableHead className="min-w-[180px] px-2">Diễn giải thuế</TableHead>
                      <TableHead className="w-20 px-2 text-center">Có hóa đơn</TableHead>
                      <TableHead className="w-24 px-2 text-right">% thuế GTGT</TableHead>
                      <TableHead className="w-32 px-2 text-right">Tiền thuế GTGT</TableHead>
                      <TableHead className="w-24 px-2">TK thuế GTGT</TableHead>
                      <TableHead className="w-32 px-2">Ngày hóa đơn</TableHead>
                      <TableHead className="w-28 px-2">Số hóa đơn</TableHead>
                      <TableHead className="w-36 px-2">Nhóm HHDV mua vào</TableHead>
                      <TableHead className="w-28 px-2">Mã NCC</TableHead>
                      <TableHead className="min-w-[140px] px-2">Tên NCC</TableHead>
                      <TableHead className="w-32 px-2">Mã số thuế NCC</TableHead>
                      <TableHead className="w-10 px-2" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxArray.fields.map((f, i) => (
                      <TableRow
                        key={f.id}
                        className="group border-border/70 hover:bg-slate-50/60 focus-within:bg-primary/[0.04]"
                      >
                        <TableCell className="px-2 py-1 text-center text-xs tabular-nums text-slate-400">
                          {i + 1}
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <CellInput {...register(`taxLines.${i}.description`)} />
                        </TableCell>
                        <TableCell className="px-2 py-1 text-center">
                          <Controller
                            control={control}
                            name={`taxLines.${i}.hasInvoice`}
                            render={({ field }) => (
                              <Checkbox
                                checked={!!field.value}
                                onCheckedChange={(v) => field.onChange(v === true)}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <Controller
                            control={control}
                            name={`taxLines.${i}.vatRate`}
                            render={({ field }) => (
                              <CellInput
                                type="number"
                                min={0}
                                value={field.value ?? ''}
                                onChange={(e) => {
                                  const rate =
                                    e.target.value === '' ? undefined : Number(e.target.value)
                                  field.onChange(rate)
                                  // Đổi thuế suất → gợi ý tiền thuế = tổng tiền hàng × %.
                                  if (rate != null && !Number.isNaN(rate)) {
                                    const base = (watch('lines') ?? []).reduce(
                                      (s, l) => s + num(l.amount),
                                      0,
                                    )
                                    setValue(
                                      `taxLines.${i}.amount`,
                                      Math.round((base * rate) / 100),
                                    )
                                  }
                                }}
                                className={cn('text-right')}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <Controller
                            control={control}
                            name={`taxLines.${i}.amount`}
                            render={({ field, fieldState }) => (
                              <AmountInput
                                value={field.value ?? 0}
                                onChange={field.onChange}
                                className={cn(
                                  cellInputCls,
                                  'text-right font-medium',
                                  fieldState.error &&
                                    'border-red-400 focus:border-red-400 focus:ring-red-200',
                                )}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <Controller
                            control={control}
                            name={`taxLines.${i}.vatAccount`}
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
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <CellInput type="date" {...register(`taxLines.${i}.invoiceDate`)} />
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <CellInput {...register(`taxLines.${i}.invoiceNo`)} />
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <CellInput {...register(`taxLines.${i}.goodsServiceGroup`)} />
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <CellInput {...register(`taxLines.${i}.partnerId`)} />
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <CellInput {...register(`taxLines.${i}.partnerName`)} />
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <CellInput {...register(`taxLines.${i}.supplierTaxCode`)} />
                        </TableCell>
                        <TableCell className="px-2 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => taxArray.remove(i)}
                            className="grid h-7 w-7 place-items-center rounded-md text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                            aria-label="Xóa dòng thuế"
                          >
                            <TrashIcon size={15} />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter className="bg-slate-100 font-semibold text-slate-800">
                    <TableRow>
                      <TableCell colSpan={4} />
                      <TableCell className="px-4 text-right tabular-nums">
                        {formatCurrency(taxTotal)}
                      </TableCell>
                      <TableCell colSpan={8} />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              <p className="text-sm text-slate-600">
                Tổng số: <b className="font-semibold text-slate-800">{taxArray.fields.length}</b>{' '}
                bản ghi
              </p>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    taxArray.append(defaultTaxLine(watch('reason'), watch('voucherDate')))
                  }
                >
                  <PlusIcon size={14} /> Thêm dòng
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setValue('taxLines', [])}
                >
                  Xóa hết dòng
                </Button>
              </div>
            </>
          )}

          {typeof formState.errors.lines?.message === 'string' && (
            <p className="text-sm text-red-600">{formState.errors.lines.message}</p>
          )}
        </section>
      </fieldset>

      {/* Thanh hành động — nền tối (cùng tông action bar khai báo số dư đầu kỳ) */}
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
              {voucherId ? (saving ? 'Đang lưu…' : 'Lưu') : isReceipt ? 'Lưu và Thêm' : 'Lưu và In'}
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
// Ô nhập trong bảng: kiểu spreadsheet — viền ẩn, hiện khi hover/focus.

// Trường "Kèm theo … chứng từ gốc" — dùng chung PT (sau Nhân viên) / PC (cạnh Lý do chi).
function AttachmentField({ register }: { register: UseFormRegister<CashVoucherFormValues> }) {
  return (
    <Field label="Kèm theo">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          placeholder="Số lượng"
          {...register('attachmentCount')}
          className="w-32"
        />
        <span className="text-sm text-slate-500">chứng từ gốc</span>
      </div>
    </Field>
  )
}
