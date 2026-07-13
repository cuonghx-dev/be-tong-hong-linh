import {
  PaymentMethod,
  SalesPaymentMode,
  SalesVoucherType,
  type CreateSalesVoucherInput,
} from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { getApiErrorMessage } from '@/shared/lib/api'
import { cn } from '@/shared/lib/cn'
import { formatCurrency } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import { PlusIcon } from '@/shared/ui/icons'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useToast } from '@/shared/ui/toast'
import { useNextSalesVoucherNo, useSalesVoucher } from '../api/useSalesVouchers'
import { useCreateSalesVoucher, useUpdateSalesVoucher } from '../api/useSalesVoucherMutations'
import {
  salesVoucherSchema,
  type SalesLineFormValues,
  type SalesVoucherFormValues,
} from '../schema'
import { PAYMENT_METHOD_LABEL, VOUCHER_TYPE_LABEL } from '../types'
import { AmountInput } from './AmountInput'

interface SalesVoucherFormProps {
  voucherId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

function emptyLine(): SalesLineFormValues {
  return { itemName: '', unit: '', quantity: 1, unitPrice: 0, tradeDiscount: 0, vatRate: 8 }
}

function defaultValues(): SalesVoucherFormValues {
  return {
    voucherType: SalesVoucherType.DomesticGoods,
    paymentMode: SalesPaymentMode.Unpaid,
    paymentMethod: PaymentMethod.Cash,
    withInvoice: true,
    isInventoryIssue: true,
    isPosInvoice: false,
    postingDate: today(),
    voucherDate: today(),
    description: 'Bán hàng',
    lines: [emptyLine()],
  }
}

// Thành tiền dòng = SL × Đơn giá − Chiết khấu; tiền thuế = thành tiền × %VAT.
function lineAmount(l: SalesLineFormValues): number {
  return Math.max(0, (l.quantity || 0) * (l.unitPrice || 0) - (l.tradeDiscount || 0))
}
function lineVat(l: SalesLineFormValues): number {
  return Math.round((lineAmount(l) * (l.vatRate || 0)) / 100)
}

export function SalesVoucherForm({ voucherId, readOnly = false, onSaved, onCancel }: SalesVoucherFormProps) {
  const editing = useSalesVoucher(voucherId ?? null)
  const create = useCreateSalesVoucher()
  const update = useUpdateSalesVoucher()
  const { toast } = useToast()

  const form = useForm<SalesVoucherFormValues>({
    resolver: zodResolver(salesVoucherSchema),
    defaultValues: defaultValues(),
  })
  const { control, register, handleSubmit, reset, watch, setValue, formState } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  // Preview số chứng từ kế tiếp khi tạo mới — số thật vẫn cấp lúc Cất.
  const nextNo = useNextSalesVoucherNo(watch('voucherDate'), !voucherId)

  useEffect(() => {
    const v = editing.data
    if (!v) return
    reset({
      voucherType: v.voucherType,
      paymentMode: v.paymentMode,
      paymentMethod: v.paymentMethod ?? PaymentMethod.Cash,
      withInvoice: v.withInvoice,
      isInventoryIssue: v.isInventoryIssue,
      isPosInvoice: v.isPosInvoice,
      postingDate: v.postingDate.slice(0, 10),
      voucherDate: v.voucherDate.slice(0, 10),
      customerId: v.customerId ?? undefined,
      customerName: v.customerName ?? undefined,
      taxCode: v.taxCode ?? undefined,
      contactPerson: v.contactPerson ?? undefined,
      address: v.address ?? undefined,
      salesEmployeeId: v.salesEmployeeId ?? undefined,
      description: v.description ?? undefined,
      paymentTermId: v.paymentTermId ?? undefined,
      creditDays: v.creditDays ?? undefined,
      dueDate: v.dueDate ?? undefined,
      lines: v.lines.map((l) => ({
        itemId: l.itemId ?? undefined,
        itemName: l.itemName ?? undefined,
        unit: l.unit ?? undefined,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        tradeDiscount: Number(l.tradeDiscount),
        vatRate: Number(l.vatRate),
        lotNo: l.lotNo ?? undefined,
      })),
    })
  }, [editing.data, reset])

  const paymentMode = watch('paymentMode')
  const lines = watch('lines')
  const totalGoods = lines?.reduce((s, l) => s + lineAmount(l), 0) ?? 0
  const totalVat = lines?.reduce((s, l) => s + lineVat(l), 0) ?? 0
  const totalPayment = totalGoods + totalVat

  const submit = (goNext: boolean) =>
    handleSubmit(async (values) => {
      const dto: CreateSalesVoucherInput = {
        ...values,
        lines: values.lines.map((l) => ({
          itemId: l.itemId,
          itemName: l.itemName,
          unit: l.unit,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          tradeDiscount: l.tradeDiscount,
          vatRate: l.vatRate,
          lotNo: l.lotNo,
        })),
      }
      try {
        if (voucherId) await update.mutateAsync({ id: voucherId, dto })
        else await create.mutateAsync(dto)
        if (goNext && !voucherId) reset(defaultValues())
        else onSaved()
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
    <form className="space-y-4">
      <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-90">
      {/* Loại nghiệp vụ + trạng thái */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium text-slate-600">Loại nghiệp vụ</label>
        <Select
          value={watch('voucherType')}
          onValueChange={(v) => setValue('voucherType', v as SalesVoucherType)}
          disabled={!!voucherId}
        >
          <SelectTrigger className="h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(SalesVoucherType).map((t) => (
              <SelectItem key={t} value={t}>
                {VOUCHER_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tùy chọn thanh toán / hóa đơn */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-border bg-slate-50 p-3 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="radio" value={SalesPaymentMode.Unpaid} {...register('paymentMode')} />
          Chưa thu tiền
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" value={SalesPaymentMode.PaidNow} {...register('paymentMode')} />
          Thu tiền ngay
        </label>
        {paymentMode === SalesPaymentMode.PaidNow && (
          <Select
            value={watch('paymentMethod')}
            onValueChange={(v) => setValue('paymentMethod', v as PaymentMethod)}
          >
            <SelectTrigger className="h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(PaymentMethod).map((m) => (
                <SelectItem key={m} value={m}>
                  {PAYMENT_METHOD_LABEL[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span className="mx-1 h-4 w-px bg-border" />
        <label className="flex items-center gap-1.5">
          <input type="checkbox" {...register('isInventoryIssue')} /> Kiêm phiếu xuất
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" {...register('withInvoice')} /> Lập kèm hóa đơn
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" {...register('isPosInvoice')} /> Hóa đơn từ máy tính tiền
        </label>
      </div>

      {/* Thông tin chung */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
        <Field label="Mã khách hàng">
          <input {...register('customerId')} className={inputCls} placeholder="Mã KH" />
        </Field>
        <Field label="Tên khách hàng">
          <input {...register('customerName')} className={inputCls} />
        </Field>
        <Field label="Mã số thuế / CCCD">
          <input {...register('taxCode')} className={inputCls} />
        </Field>
        <Field label="Người liên hệ">
          <input {...register('contactPerson')} className={inputCls} />
        </Field>
        <Field label="Địa chỉ">
          <input {...register('address')} className={inputCls} />
        </Field>
        <Field label="Nhân viên bán hàng">
          <input {...register('salesEmployeeId')} className={inputCls} />
        </Field>
        <Field label="Diễn giải">
          <input {...register('description')} className={inputCls} />
        </Field>
        <Field label="Số chứng từ">
          <input
            value={editing.data?.voucherNo ?? nextNo.data ?? 'Tự động'}
            readOnly
            title="Số dự kiến — cấp chính thức khi Cất"
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

      {/* Bảng hàng tiền */}
      <div className="rounded-md border border-border">
        <div className="flex items-center gap-2 border-b border-border bg-slate-50 px-2 py-1.5">
          <span className="text-sm font-medium text-slate-600">Hàng tiền</span>
          <Button type="button" variant="outline" size="sm" onClick={() => append(emptyLine())}>
            <PlusIcon size={14} /> Thêm dòng
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => reset({ ...watch(), lines: [emptyLine()] })}
          >
            Xóa hết dòng
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-8 px-2 py-1.5 text-center">#</th>
                <th className="px-2 py-1.5">Tên hàng</th>
                <th className="w-16 px-2 py-1.5">ĐVT</th>
                <th className="w-20 px-2 py-1.5 text-right">SL</th>
                <th className="w-32 px-2 py-1.5 text-right">Đơn giá</th>
                <th className="w-32 px-2 py-1.5 text-right">Thành tiền</th>
                <th className="w-16 px-2 py-1.5 text-right">%VAT</th>
                <th className="w-32 px-2 py-1.5 text-right">Tiền thuế</th>
                <th className="w-8 px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={f.id} className="border-t border-border">
                  <td className="px-2 py-1 text-center text-slate-400">{i + 1}</td>
                  <td className="px-2 py-1">
                    <input {...register(`lines.${i}.itemName`)} className={cellCls} />
                  </td>
                  <td className="px-2 py-1">
                    <input {...register(`lines.${i}.unit`)} className={cellCls} />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      {...register(`lines.${i}.quantity`)}
                      className={cn(cellCls, 'text-right')}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Controller
                      control={control}
                      name={`lines.${i}.unitPrice`}
                      render={({ field }) => (
                        <AmountInput value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-slate-700">
                    {formatCurrency(lineAmount(lines?.[i] ?? f))}
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      {...register(`lines.${i}.vatRate`)}
                      className={cn(cellCls, 'text-right')}
                    />
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-slate-700">
                    {formatCurrency(lineVat(lines?.[i] ?? f))}
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
          </table>
        </div>
      </div>

      {typeof formState.errors.lines?.message === 'string' && (
        <p className="text-sm text-red-600">{formState.errors.lines.message}</p>
      )}

      {/* Tổng cộng */}
      <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Tổng tiền hàng</span>
          <span className="tabular-nums">{formatCurrency(totalGoods)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Thuế GTGT</span>
          <span className="tabular-nums">{formatCurrency(totalVat)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1 font-semibold">
          <span>Tổng tiền thanh toán</span>
          <span className="tabular-nums text-primary">{formatCurrency(totalPayment)}</span>
        </div>
      </div>

      </fieldset>

      {/* Nút hành động */}
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
            <Button type="button" onClick={submit(false)} disabled={saving}>
              {saving ? 'Đang cất…' : 'Cất'}
            </Button>
            {!voucherId && (
              <Button type="button" variant="secondary" onClick={submit(true)} disabled={saving}>
                Cất và Thêm
              </Button>
            )}
          </>
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
