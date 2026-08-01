import {
  CHART_OF_ACCOUNTS,
  GENERAL_LINE_OPERATION_LABELS,
  GENERAL_TAX_TYPE_LABELS,
  GeneralLineOperation,
  GeneralTaxType,
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
import { PlusIcon, TrashIcon } from '@/shared/ui/icons'
import { PartnerPicker, type PartnerOption } from '@/shared/ui/partner-picker'
import { QuickAddPartnerDialog } from '@/shared/ui/quick-add-partner-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { useToast } from '@/shared/ui/toast'
import { cn } from '@/shared/lib/cn'
import { num } from '@/shared/lib/num'
import { AmountInput } from '@/shared/ui/amount-input'
import { Input } from '@/shared/ui/input'
import { Field } from '@/shared/ui/field'
import { Checkbox } from '@/shared/ui/checkbox'
import { CheckboxField } from '@/shared/ui/checkbox-field'
import { CellInput, cellInputCls } from '@/shared/ui/cell-input'
import { useGeneralVoucher, useNextGeneralVoucherNo } from '../api/useGeneralVouchers'
import {
  useCreateGeneralVoucher,
  useUpdateGeneralVoucher,
} from '../api/useGeneralVoucherMutations'
import {
  generalVoucherSchema,
  type GeneralLineFormValues,
  type GeneralTaxLineFormValues,
  type GeneralVoucherFormValues,
} from '../schema'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { TabBar } from '@/shared/ui/tab-bar'

// Vế bút toán của ô đối tượng — dùng để dựng tên field (debitPartnerId / creditPartnerId).
// 'tax' = ô đối tượng trên dòng kê khai hóa đơn (taxLines.*.partnerId).
type PartnerSide = 'debit' | 'credit' | 'tax'

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

// Dòng kê khai hóa đơn mặc định — MISA mở sẵn 1 dòng "Thuế GTGT - <diễn giải>",
// có hóa đơn, TK 1331; loại thuế/số tiền để người dùng nhập.
const emptyTaxLine = (description?: string): GeneralTaxLineFormValues => ({
  description: description ? `Thuế GTGT - ${description}` : 'Thuế GTGT',
  hasInvoice: false,
  taxableAmount: 0,
  vatAmount: 0,
  vatAccount: CHART_OF_ACCOUNTS.VAT_INPUT_DEDUCTIBLE,
})

function defaultValues(): GeneralVoucherFormValues {
  return {
    postingDate: today(),
    voucherDate: today(),
    description: '',
    excludeFromVatReport: false,
    lines: [emptyLine()],
    taxLines: [emptyTaxLine()],
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
  const taxArray = useFieldArray({ control, name: 'taxLines' })
  // 2 tab như MISA: bảng hạch toán ↔ bảng kê khai hóa đơn (chung 1 form, chung nút Lưu).
  const [tab, setTab] = useState<'entry' | 'tax'>('entry')

  // Picker đối tượng theo dòng (+ tạo nhanh) — MISA tách đối tượng vế Nợ và vế Có.
  const [partnerKw, setPartnerKw] = useState('')
  const { items: partnerItems, loading: partnerLoading } = usePartnerOptions(partnerKw)
  // Dialog tạo nhanh gắn với ô đang thao tác (null = đóng) — nhớ cả vế để điền lại đúng cột.
  const [partnerDialogAt, setPartnerDialogAt] = useState<{ line: number; side: PartnerSide } | null>(
    null,
  )
  const selectLinePartner = (i: number, side: PartnerSide, p: PartnerOption) => {
    if (side === 'tax') {
      selectTaxPartner(i, p)
      return
    }
    setValue(`lines.${i}.${side}PartnerId`, p.code)
    setValue(`lines.${i}.${side}PartnerName`, p.name)
  }
  // Đối tượng trên dòng kê khai hóa đơn — kèm mã số thuế để lên bảng kê.
  const selectTaxPartner = (i: number, p: PartnerOption) => {
    setValue(`taxLines.${i}.partnerId`, p.code)
    setValue(`taxLines.${i}.partnerName`, p.name)
    if (p.taxCode) setValue(`taxLines.${i}.supplierTaxCode`, p.taxCode)
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
      branchId: v.branchId ?? undefined,
      excludeFromVatReport: v.excludeFromVatReport,
      taxLines:
        v.taxLines.length > 0
          ? v.taxLines.map((t) => ({
              description: t.description ?? undefined,
              hasInvoice: t.hasInvoice,
              taxType: t.taxType ?? undefined,
              taxableAmount: Number(t.taxableAmount),
              vatRate: t.vatRate != null ? Number(t.vatRate) : undefined,
              vatAmount: Number(t.vatAmount),
              vatAccount: t.vatAccount ?? undefined,
              invoiceNo: t.invoiceNo ?? undefined,
              invoiceDate: t.invoiceDate ? t.invoiceDate.slice(0, 10) : undefined,
              goodsServiceGroup: t.goodsServiceGroup ?? undefined,
              partnerId: t.partnerId ?? undefined,
              partnerName: t.partnerName ?? undefined,
              supplierTaxCode: t.supplierTaxCode ?? undefined,
            }))
          : [emptyTaxLine(v.description ?? undefined)],
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
  // Tổng tab kê khai — không cộng vào Tổng tiền chứng từ (dòng kê khai không phải bút toán).
  const taxLines = watch('taxLines')
  const taxableTotal = taxLines?.reduce((s, t) => s + num(t.taxableAmount), 0) ?? 0
  const vatTotal = taxLines?.reduce((s, t) => s + num(t.vatAmount), 0) ?? 0

  // Gõ Diễn giải ở thông tin chung → điền xuống MỌI dòng hạch toán và dòng kê khai
  // thuế ("Thuế GTGT - <diễn giải>"), như MISA (ghi đè cả dòng đã sửa tay).
  const syncDescription = (text: string) => {
    ;(watch('lines') ?? []).forEach((_, i) => setValue(`lines.${i}.description`, text))
    ;(watch('taxLines') ?? []).forEach((_, i) =>
      setValue(`taxLines.${i}.description`, emptyTaxLine(text).description),
    )
  }

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
        branchId: values.branchId,
        excludeFromVatReport: values.excludeFromVatReport,
        // Dòng kê khai thuế: gửi hết, BE lọc dòng trắng (0 tiền thuế & 0 giá trị HHDV).
        taxLines: (values.taxLines ?? []).map((t) => ({
          description: t.description,
          hasInvoice: t.hasInvoice ?? false,
          taxType: t.taxType || null,
          taxableAmount: t.taxableAmount,
          vatRate: t.vatRate,
          vatAmount: t.vatAmount,
          vatAccount: t.vatAccount || null,
          invoiceNo: t.invoiceNo || null,
          invoiceDate: t.invoiceDate || null,
          goodsServiceGroup: t.goodsServiceGroup || null,
          partnerId: t.partnerId || null,
          partnerName: t.partnerName || null,
          supplierTaxCode: t.supplierTaxCode || null,
        })),
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
              <Input
                {...register('description', {
                  onChange: (e) => syncDescription(e.target.value),
                })}
              />
            </Field>
            <div className="flex gap-3">
              <Field label="Hạn thanh toán" className="w-56">
                <Input type="date" {...register('dueDate')} />
              </Field>
            </div>
          </div>

          {/* Cột phải: ngày + số chứng từ */}
          <div className="w-56 space-y-3">
            <Field label="Ngày hạch toán" error={formState.errors.postingDate?.message}>
              <Input type="date" {...register('postingDate')} />
            </Field>
            <Field label="Ngày chứng từ" error={formState.errors.voucherDate?.message}>
              <Input type="date" {...register('voucherDate')} />
            </Field>
            <Field label="Số chứng từ">
              <Input
                value={voucherId ? (editing.data?.voucherNo ?? '…') : (nextNo.data ?? 'Tự động')}
                readOnly
                title="Số dự kiến — cấp chính thức khi Lưu"
                className="bg-slate-50 text-slate-500"
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

        {/* Bảng hạch toán / kê khai hóa đơn — lớp nền trắng, 2 tab như MISA */}
        <section className="space-y-2 px-6 py-5">
          <TabBar
            size="lg"
            value={tab}
            onChange={setTab}
            items={[
              { key: 'entry', label: 'Hạch toán' },
              { key: 'tax', label: 'Kê khai hóa đơn và hạch toán thuế' },
            ]}
            className="border-b border-border pb-2"
          />

          <div className={cn('space-y-2', tab !== 'entry' && 'hidden')}>
          <div className="overflow-x-auto rounded-md border border-border">
            <Table data-testid="general-entry-table">
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead className="w-8 px-2 py-1.5 text-center">#</TableHead>
                  <TableHead className="px-2 py-1.5">Diễn&nbsp;giải</TableHead>
                  <TableHead className="w-24 px-2 py-1.5">TK Nợ</TableHead>
                  <TableHead className="w-24 px-2 py-1.5">TK Có</TableHead>
                  <TableHead className="w-36 px-2 py-1.5 text-right">Số&nbsp;tiền</TableHead>
                  <TableHead className="w-40 px-2 py-1.5">Nghiệp&nbsp;vụ</TableHead>
                  <TableHead className="px-2 py-1.5">Đối&nbsp;tượng Nợ</TableHead>
                  <TableHead className="px-2 py-1.5">Tên đối&nbsp;tượng Nợ</TableHead>
                  <TableHead className="px-2 py-1.5">Đối&nbsp;tượng Có</TableHead>
                  <TableHead className="px-2 py-1.5">Tên đối&nbsp;tượng Có</TableHead>
                  <TableHead className="w-8 px-2 py-1.5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((f, i) => (
                  <TableRow key={f.id}>
                    <TableCell className="px-2 py-1 text-center text-slate-400">{i + 1}</TableCell>
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
                        render={({ field }) => (
                          <AmountInput value={field.value} onChange={field.onChange} className={cellInputCls} />
                        )}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <Controller
                        control={control}
                        name={`lines.${i}.operation`}
                        render={({ field }) => (
                          <Select value={field.value || undefined} onValueChange={field.onChange}>
                            <SelectTrigger className={cellInputCls}>
                              <SelectValue placeholder="--" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.values(GeneralLineOperation).map((op) => (
                                <SelectItem key={op} value={op}>
                                  {GENERAL_LINE_OPERATION_LABELS[op]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-1">
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
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <CellInput {...register(`lines.${i}.debitPartnerName`)} />
                    </TableCell>
                    <TableCell className="px-2 py-1">
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
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <CellInput {...register(`lines.${i}.creditPartnerName`)} />
                    </TableCell>
                    <TableCell className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => fields.length > 1 && remove(i)}
                        className="text-slate-400 hover:text-red-600"
                        aria-label="Xóa dòng"
                      >
                        ✕
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-slate-100">
                <TableRow>
                  <TableCell className="px-2 py-1.5" colSpan={4} />
                  <TableCell className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(total)}</TableCell>
                  <TableCell colSpan={6} />
                </TableRow>
              </TableFooter>
            </Table>
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
          </div>

          {/* Tab kê khai hóa đơn — dòng chỉ lên bảng kê thuế GTGT, không sinh bút toán */}
          <div className={cn('space-y-2', tab !== 'tax' && 'hidden')}>
            <div className="overflow-x-auto rounded-md border border-border">
              <Table data-testid="general-tax-table">
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="w-8 px-2 py-1.5 text-center">#</TableHead>
                    <TableHead className="min-w-[200px] px-2 py-1.5">Diễn&nbsp;giải thuế</TableHead>
                    <TableHead className="w-20 px-2 py-1.5 text-center">Có hóa&nbsp;đơn</TableHead>
                    <TableHead className="w-44 px-2 py-1.5">Loại&nbsp;thuế</TableHead>
                    <TableHead className="w-40 px-2 py-1.5 text-right">Giá trị HHDV chưa&nbsp;thuế</TableHead>
                    <TableHead className="w-24 px-2 py-1.5 text-right">% thuế&nbsp;GTGT</TableHead>
                    <TableHead className="w-36 px-2 py-1.5 text-right">Tiền thuế&nbsp;GTGT</TableHead>
                    <TableHead className="w-24 px-2 py-1.5">TK thuế&nbsp;GTGT</TableHead>
                    <TableHead className="w-28 px-2 py-1.5">Số hóa&nbsp;đơn</TableHead>
                    <TableHead className="w-36 px-2 py-1.5">Ngày hóa&nbsp;đơn</TableHead>
                    <TableHead className="w-32 px-2 py-1.5">Nhóm&nbsp;HHDV</TableHead>
                    <TableHead className="w-44 px-2 py-1.5">Mã đối&nbsp;tượng</TableHead>
                    <TableHead className="min-w-[140px] px-2 py-1.5">Tên đối&nbsp;tượng</TableHead>
                    <TableHead className="w-32 px-2 py-1.5">Mã số&nbsp;thuế</TableHead>
                    <TableHead className="w-8 px-2 py-1.5" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxArray.fields.map((f, i) => (
                    <TableRow key={f.id}>
                      <TableCell className="px-2 py-1 text-center text-slate-400">{i + 1}</TableCell>
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
                          name={`taxLines.${i}.taxType`}
                          render={({ field }) => (
                            <Select value={field.value || undefined} onValueChange={field.onChange}>
                              <SelectTrigger className={cellInputCls}>
                                <SelectValue placeholder="--" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.values(GeneralTaxType).map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {GENERAL_TAX_TYPE_LABELS[t]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <Controller
                          control={control}
                          name={`taxLines.${i}.taxableAmount`}
                          render={({ field }) => (
                            <AmountInput
                              value={field.value ?? 0}
                              onChange={(v) => {
                                field.onChange(v)
                                // Có thuế suất → tự tính tiền thuế = giá trị chưa thuế × %.
                                const rate = watch(`taxLines.${i}.vatRate`)
                                if (rate != null)
                                  setValue(
                                    `taxLines.${i}.vatAmount`,
                                    Math.round((num(v) * rate) / 100),
                                  )
                              }}
                              className={cellInputCls}
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
                              max={100}
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const rate = e.target.value === '' ? undefined : Number(e.target.value)
                                field.onChange(rate)
                                if (rate != null && !Number.isNaN(rate)) {
                                  const base = num(watch(`taxLines.${i}.taxableAmount`))
                                  setValue(`taxLines.${i}.vatAmount`, Math.round((base * rate) / 100))
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
                          name={`taxLines.${i}.vatAmount`}
                          render={({ field }) => (
                            <AmountInput value={field.value ?? 0} onChange={field.onChange} className={cellInputCls} />
                          )}
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <Controller
                          control={control}
                          name={`taxLines.${i}.vatAccount`}
                          render={({ field }) => (
                            <AccountPicker
                              value={field.value}
                              onChange={field.onChange}
                              inputClassName={accountCellCls}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <CellInput {...register(`taxLines.${i}.invoiceNo`)} />
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <CellInput
                          type="date"
                          {...register(`taxLines.${i}.invoiceDate`)}
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <CellInput
                          {...register(`taxLines.${i}.goodsServiceGroup`)}
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <PartnerPicker
                          value={watch(`taxLines.${i}.partnerId`)}
                          items={partnerItems}
                          loading={partnerLoading}
                          keyword={partnerKw}
                          onKeywordChange={setPartnerKw}
                          onSelect={(p) => selectTaxPartner(i, p)}
                          onAddNew={() => setPartnerDialogAt({ line: i, side: 'tax' })}
                          inputClassName="h-8"
                        />
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
                          className="text-slate-400 hover:text-red-600"
                          aria-label="Xóa dòng kê khai"
                        >
                          <TrashIcon size={15} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-slate-100">
                  <TableRow>
                    <TableCell colSpan={4} />
                    <TableCell className="px-2 py-1.5 text-right tabular-nums">
                      {formatCurrency(taxableTotal)}
                    </TableCell>
                    <TableCell />
                    <TableCell className="px-2 py-1.5 text-right tabular-nums">
                      {formatCurrency(vatTotal)}
                    </TableCell>
                    <TableCell colSpan={8} />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>
                Tổng số: <b className="text-slate-700">{taxArray.fields.length}</b> bản ghi
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => taxArray.append(emptyTaxLine(watch('description')))}
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

            <CheckboxField
              control={control}
              name="excludeFromVatReport"
              label="Không lên bảng kê thuế GTGT"
              className="pt-1"
            />
          </div>
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

// Tab bảng dữ liệu (Hạch toán / Kê khai hóa đơn) — link kiểu MISA, gạch chân tab đang mở.