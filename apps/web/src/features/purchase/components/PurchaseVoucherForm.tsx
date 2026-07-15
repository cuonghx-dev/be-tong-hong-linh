import {
  CHART_OF_ACCOUNTS,
  PartnerType,
  PaymentMethod,
  PurchaseOrigin,
  PurchasePaymentMode,
  PurchaseVoucherType,
  type CreatePurchaseVoucherInput,
} from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { getApiErrorMessage } from '@/shared/lib/api'
import { cn } from '@/shared/lib/cn'
import { formatCurrency } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import { PlusIcon } from '@/shared/ui/icons'
import { PartnerPicker, type PartnerOption } from '@/shared/ui/partner-picker'
import { QuickAddPartnerDialog } from '@/shared/ui/quick-add-partner-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useToast } from '@/shared/ui/toast'
import { useSuppliers } from '../api/useSuppliers'
import { useNextPurchaseVoucherNo, usePurchaseVoucher } from '../api/usePurchaseVouchers'
import {
  useCreatePurchaseVoucher,
  useUpdatePurchaseVoucher,
} from '../api/usePurchaseVoucherMutations'
import {
  purchaseVoucherSchema,
  type PurchaseLineFormValues,
  type PurchaseVoucherFormValues,
} from '../schema'
import {
  PAYMENT_METHOD_LABEL,
  PURCHASE_REASON_OPTIONS,
  VOUCHER_TYPE_LABEL,
  hasWarehouse,
  parseReasonKey,
  reasonKey,
} from '../types'
import { MoneyInput } from './MoneyInput'

interface Props {
  type: PurchaseVoucherType
  voucherId?: string | null
  // Tạo mới bằng cách nhân bản chứng từ này — điền sẵn dữ liệu, số chứng từ cấp lại khi Lưu.
  duplicateFromId?: string | null
  // Điền sẵn NCC khi lập chứng từ từ danh mục NCC (nút "Lập CT mua hàng").
  initialSupplier?: { code: string; name: string; address?: string } | null
  readOnly?: boolean
  // Nút hành động thêm ở footer khi xem (vd. Sửa nhanh / Bỏ ghi) — page truyền vào.
  actions?: ReactNode
  onSaved: () => void
  onCancel: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

function defaultStockAccount(type: PurchaseVoucherType): string {
  return type === PurchaseVoucherType.Stock
    ? CHART_OF_ACCOUNTS.GOODS
    : CHART_OF_ACCOUNTS.SERVICE_EXPENSE
}

function emptyLine(type: PurchaseVoucherType): PurchaseLineFormValues {
  return {
    quantity: 1,
    unitPrice: 0,
    vatRate: 8,
    stockAccount: defaultStockAccount(type),
    payableAccount: CHART_OF_ACCOUNTS.PAYABLE,
    vatAccount: CHART_OF_ACCOUNTS.VAT_INPUT_DEDUCTIBLE,
  }
}

function defaultValues(type: PurchaseVoucherType): PurchaseVoucherFormValues {
  return {
    type,
    origin: PurchaseOrigin.Domestic,
    paymentMode: PurchasePaymentMode.Unpaid,
    paymentMethod: PaymentMethod.Cash,
    receiveWithInvoice: false,
    postingDate: today(),
    voucherDate: today(),
    description: 'Mua hàng',
    purchaseCost: 0,
    lines: [emptyLine(type)],
  }
}

export function PurchaseVoucherForm({
  type,
  voucherId,
  duplicateFromId,
  initialSupplier,
  readOnly = false,
  actions,
  onSaved,
  onCancel,
}: Props) {
  // Nạp dữ liệu từ chứng từ đang sửa HOẶC chứng từ nguồn khi nhân bản.
  const duplicating = !voucherId && !!duplicateFromId
  const editing = usePurchaseVoucher(voucherId ?? duplicateFromId ?? null)
  const create = useCreatePurchaseVoucher()
  const update = useUpdatePurchaseVoucher()
  const { toast } = useToast()

  const form = useForm<PurchaseVoucherFormValues>({
    resolver: zodResolver(purchaseVoucherSchema),
    defaultValues: {
      ...defaultValues(type),
      // Lập CT từ danh mục NCC: điền sẵn nhà cung cấp (bị đè khi sửa/nhân bản).
      ...(initialSupplier
        ? {
            supplierId: initialSupplier.code,
            supplierName: initialSupplier.name,
            address: initialSupplier.address,
          }
        : {}),
    },
  })
  const { control, register, handleSubmit, reset, watch, setValue, formState } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  // Preview số chứng từ kế tiếp khi tạo mới — số thật vẫn cấp lúc Lưu.
  const nextNo = useNextPurchaseVoucherNo(type, watch('voucherDate'), !voucherId)

  // Picker nhà cung cấp: tra cứu theo mã/tên, tự điền tên + địa chỉ.
  const [supplierKw, setSupplierKw] = useState('')
  // Chỉ NCC đang sử dụng — NCC "ngừng sử dụng" không được chọn cho chứng từ mới.
  const suppliers = useSuppliers({
    page: 1,
    pageSize: 20,
    keyword: supplierKw.trim() || undefined,
    isActive: true,
  })
  const supplierItems = useMemo<PartnerOption[]>(
    () =>
      (suppliers.data?.data ?? []).map((s) => ({
        code: s.code,
        name: s.name,
        type: PartnerType.Supplier,
        taxCode: s.taxCode,
        address: s.address,
        phone: s.phone,
      })),
    [suppliers.data],
  )

  // Tạo nhanh nhà cung cấp (dialog mở từ nút + trên picker).
  const [supplierDialog, setSupplierDialog] = useState(false)
  const selectSupplier = (p: PartnerOption) => {
    setValue('supplierId', p.code)
    setValue('supplierName', p.name)
    if (p.address) setValue('address', p.address)
  }

  // Nạp dữ liệu khi sửa.
  useEffect(() => {
    const v = editing.data
    if (!v) return
    reset({
      type: v.type,
      origin: v.origin,
      paymentMode: v.paymentMode,
      paymentMethod: v.paymentMethod ?? undefined,
      receiveWithInvoice: v.receiveWithInvoice,
      invoiceNo: v.invoiceNo ?? undefined,
      // Nhân bản → ngày về hôm nay (chứng từ mới), sửa → giữ nguyên ngày gốc.
      postingDate: duplicating ? today() : v.postingDate.slice(0, 10),
      voucherDate: duplicating ? today() : v.voucherDate.slice(0, 10),
      supplierId: v.supplierId ?? undefined,
      supplierName: v.supplierName ?? undefined,
      deliverer: v.deliverer ?? undefined,
      address: v.address ?? undefined,
      employeeId: v.employeeId ?? undefined,
      description: v.description ?? undefined,
      attachmentCount: v.attachmentCount,
      contractNo: v.contractNo ?? undefined,
      paymentTermId: v.paymentTermId ?? undefined,
      creditDays: v.creditDays ?? undefined,
      dueDate: v.dueDate ?? undefined,
      purchaseCost: Number(v.purchaseCost),
      einvoiceLookupCode: v.einvoiceLookupCode ?? undefined,
      einvoiceLookupUrl: v.einvoiceLookupUrl ?? undefined,
      branchId: v.branchId ?? undefined,
      lines: v.lines.map((l) => ({
        itemId: l.itemId ?? undefined,
        itemName: l.itemName ?? undefined,
        warehouseId: l.warehouseId ?? undefined,
        stockAccount: l.stockAccount ?? undefined,
        payableAccount: l.payableAccount,
        unit: l.unit ?? undefined,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        vatRate: Number(l.vatRate),
        vatAccount: l.vatAccount,
      })),
    })
  }, [editing.data, reset, duplicating])

  const lines = watch('lines')
  const purchaseCost = watch('purchaseCost') ?? 0
  const paymentMode = watch('paymentMode')
  const receiveWithInvoice = watch('receiveWithInvoice')
  // Loại/nguồn gốc là trạng thái form (đổi qua dropdown "Lý do"), không dùng prop cố định.
  const currentType = watch('type')
  const currentOrigin = watch('origin')
  const showWarehouse = hasWarehouse(currentType)
  const isService = type === PurchaseVoucherType.Service
  const isUnpaid = paymentMode === PurchasePaymentMode.Unpaid

  // §10.2 tổng hợp.
  const totalGoods = lines?.reduce((s, l) => s + (l.quantity || 0) * (l.unitPrice || 0), 0) ?? 0
  const totalVat =
    lines?.reduce(
      (s, l) => s + ((l.quantity || 0) * (l.unitPrice || 0) * (l.vatRate || 0)) / 100,
      0,
    ) ?? 0
  const totalPayment = totalGoods + totalVat
  const stockValue = totalGoods + (purchaseCost || 0)

  const submit = (goNext: boolean) =>
    handleSubmit(async (values) => {
      const dto: CreatePurchaseVoucherInput = {
        ...values,
        lines: values.lines.map((l) => ({
          itemId: l.itemId,
          itemName: l.itemName,
          warehouseId: showWarehouse ? l.warehouseId : undefined,
          stockAccount: l.stockAccount,
          payableAccount: l.payableAccount,
          unit: l.unit,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          vatRate: l.vatRate,
          vatAccount: l.vatAccount,
        })),
      }
      try {
        if (voucherId) await update.mutateAsync({ id: voucherId, dto })
        else await create.mutateAsync(dto)
        if (goNext && !voucherId) {
          // Giữ nguyên "Lý do" (loại + nguồn gốc) đang chọn khi lưu và thêm tiếp.
          reset({ ...defaultValues(values.type), origin: values.origin })
        } else onSaved()
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
      <fieldset disabled={readOnly} className="flex-1 space-y-4 overflow-y-auto pr-1 disabled:opacity-90">
      {/* Lý do (loại nghiệp vụ) + số hợp đồng */}
      <div className="flex flex-wrap items-center gap-3">
        {isService ? (
          <span className="rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
            {VOUCHER_TYPE_LABEL[type]}
          </span>
        ) : (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Lý do</span>
            <Select
              value={reasonKey(currentOrigin, currentType)}
              disabled={readOnly}
              onValueChange={(v) => {
                const { origin, type: t } = parseReasonKey(v)
                setValue('origin', origin)
                setValue('type', t)
              }}
            >
              <SelectTrigger className="h-9 w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PURCHASE_REASON_OPTIONS.map((opt) => (
                  <SelectItem key={reasonKey(opt.origin, opt.type)} value={reasonKey(opt.origin, opt.type)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}
        <input
          {...register('contractNo')}
          placeholder="Nhập số hợp đồng mua …"
          className={cn(inputCls, 'w-56')}
        />
      </div>

      {/* Tùy chọn thanh toán */}
      <div className="flex flex-wrap items-center gap-4 rounded-md bg-slate-50 px-3 py-2">
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" value={PurchasePaymentMode.Unpaid} {...register('paymentMode')} />
          Chưa thanh toán
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" value={PurchasePaymentMode.Immediate} {...register('paymentMode')} />
          Thanh toán ngay
        </label>
        {paymentMode === PurchasePaymentMode.Immediate && (
          <Select
            value={watch('paymentMethod')}
            onValueChange={(v) => setValue('paymentMethod', v as PaymentMethod)}
          >
            <SelectTrigger className="h-8 w-auto bg-white">
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
        <label className="ml-auto flex items-center gap-1.5 text-sm">
          <input type="checkbox" {...register('receiveWithInvoice')} />
          Nhận kèm hóa đơn
        </label>
      </div>

      {/* Thông tin chung */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
        <Field label="Mã nhà cung cấp">
          <PartnerPicker
            value={watch('supplierId')}
            items={supplierItems}
            loading={suppliers.isLoading}
            keyword={supplierKw}
            onKeywordChange={setSupplierKw}
            placeholder="Mã NCC"
            onSelect={selectSupplier}
            onAddNew={() => setSupplierDialog(true)}
          />
        </Field>
        <Field label="Tên nhà cung cấp">
          <input {...register('supplierName')} className={inputCls} />
        </Field>
        <Field label="Người giao hàng">
          <input {...register('deliverer')} className={inputCls} />
        </Field>
        <Field label="Địa chỉ">
          <input {...register('address')} className={inputCls} />
        </Field>
        <Field label="Nhân viên mua hàng">
          <input {...register('employeeId')} className={inputCls} />
        </Field>
        <Field label="Diễn giải">
          <input {...register('description')} className={inputCls} />
        </Field>
        <Field label="Số chứng từ">
          <input
            value={editing.data?.voucherNo ?? nextNo.data ?? 'Tự động'}
            readOnly
            title="Số dự kiến — cấp chính thức khi Lưu"
            className={cn(inputCls, 'bg-slate-50 text-slate-500')}
          />
        </Field>
        <Field label="Ngày hạch toán" error={formState.errors.postingDate?.message}>
          <input type="date" {...register('postingDate')} className={inputCls} />
        </Field>
        <Field label="Ngày chứng từ" error={formState.errors.voucherDate?.message}>
          <input type="date" {...register('voucherDate')} className={inputCls} />
        </Field>
        <Field label="Kèm theo (chứng từ gốc)">
          <input type="number" min={0} {...register('attachmentCount')} className={inputCls} />
        </Field>
        {/* Điều khoản thanh toán chỉ có nghĩa khi còn nợ (§chưa thanh toán) */}
        {isUnpaid && (
          <>
            <Field label="Điều khoản thanh toán">
              <input {...register('paymentTermId')} className={inputCls} />
            </Field>
            <Field label="Số ngày được nợ">
              <input type="number" min={0} {...register('creditDays')} className={inputCls} />
            </Field>
            <Field label="Hạn thanh toán">
              <input type="date" {...register('dueDate')} className={inputCls} />
            </Field>
          </>
        )}
      </div>

      {/* Bảng hàng tiền */}
      <div className="rounded-md border border-border">
        <div className="flex items-center gap-2 border-b border-border bg-slate-50 px-2 py-1.5">
          <span className="text-sm font-medium text-slate-600">Hàng tiền</span>
          <Button type="button" variant="outline" size="sm" onClick={() => append(emptyLine(currentType))}>
            <PlusIcon size={14} /> Thêm dòng
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-8 px-2 py-1.5 text-center">#</th>
                <th className="px-2 py-1.5">Mã hàng</th>
                <th className="px-2 py-1.5">Tên hàng</th>
                {showWarehouse && <th className="px-2 py-1.5">Kho</th>}
                <th className="w-20 px-2 py-1.5">TK Kho</th>
                <th className="w-16 px-2 py-1.5">ĐVT</th>
                <th className="w-20 px-2 py-1.5 text-right">SL</th>
                <th className="w-28 px-2 py-1.5 text-right">Đơn&nbsp;giá</th>
                <th className="w-32 px-2 py-1.5 text-right">Thành&nbsp;tiền</th>
                <th className="w-16 px-2 py-1.5 text-right">% GTGT</th>
                <th className="w-28 px-2 py-1.5 text-right">Tiền&nbsp;thuế</th>
                <th className="w-20 px-2 py-1.5">TK CN</th>
                <th className="w-20 px-2 py-1.5">TK thuế</th>
                <th className="w-8 px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => {
                const l = lines?.[i]
                const amount = (l?.quantity || 0) * (l?.unitPrice || 0)
                const vat = (amount * (l?.vatRate || 0)) / 100
                return (
                  <tr key={f.id} className="border-t border-border">
                    <td className="px-2 py-1 text-center text-slate-400">{i + 1}</td>
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.itemId`)} className={cellCls} />
                    </td>
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.itemName`)} className={cellCls} />
                    </td>
                    {showWarehouse && (
                      <td className="px-2 py-1">
                        <input {...register(`lines.${i}.warehouseId`)} className={cellCls} />
                      </td>
                    )}
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.stockAccount`)} className={cellCls} />
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
                          <MoneyInput value={field.value} onChange={field.onChange} />
                        )}
                      />
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-slate-700">
                      {formatCurrency(amount)}
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
                      {formatCurrency(vat)}
                    </td>
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.payableAccount`)} className={cellCls} />
                    </td>
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.vatAccount`)} className={cellCls} />
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
                )
              })}
            </tbody>
            <tfoot className="bg-slate-100 font-medium">
              <tr className="border-t border-border">
                <td className="px-2 py-1.5" colSpan={showWarehouse ? 8 : 7}>
                  Tổng cộng
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(totalGoods)}</td>
                <td />
                <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(totalVat)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {typeof formState.errors.lines?.message === 'string' && (
        <p className="text-sm text-red-600">{formState.errors.lines.message}</p>
      )}

      {/* Tổng hợp */}
      <div className="ml-auto grid w-full max-w-sm grid-cols-2 gap-y-1.5 text-sm">
        <span className="text-slate-500">Tổng tiền hàng</span>
        <span className="text-right tabular-nums">{formatCurrency(totalGoods)}</span>
        <span className="text-slate-500">Thuế GTGT</span>
        <span className="text-right tabular-nums">{formatCurrency(totalVat)}</span>
        <span className="text-slate-500">Chi phí mua hàng</span>
        <span className="text-right">
          <Controller
            control={control}
            name="purchaseCost"
            render={({ field }) => (
              <MoneyInput
                value={field.value ?? 0}
                onChange={field.onChange}
                className="h-7 w-32 ml-auto"
              />
            )}
          />
        </span>
        <span className="text-slate-500">Giá trị nhập kho</span>
        <span className="text-right tabular-nums">{formatCurrency(stockValue)}</span>
        <span className="font-semibold text-slate-700">Tổng tiền thanh toán</span>
        <span className="text-right font-semibold tabular-nums text-primary">
          {formatCurrency(totalPayment)}
        </span>
      </div>

      {/* Thông tin hóa đơn — chỉ khi nhận kèm hóa đơn (tab Hóa đơn của MISA) */}
      {receiveWithInvoice && (
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-md border border-border p-3 md:grid-cols-2">
          <Field label="Số hóa đơn">
            <input {...register('invoiceNo')} className={inputCls} />
          </Field>
          <div className="hidden md:block" />
          <Field label="Mã tra cứu HĐĐT">
            <input {...register('einvoiceLookupCode')} className={inputCls} />
          </Field>
          <Field label="Đường dẫn tra cứu HĐĐT">
            <input {...register('einvoiceLookupUrl')} className={inputCls} />
          </Field>
        </div>
      )}

      </fieldset>

      {/* Nút hành động — footer cố định */}
      <div className="mt-3 flex shrink-0 justify-end gap-2 border-t border-border pt-3">
        {readOnly ? (
          <>
            {actions}
            <Button type="button" variant="outline" onClick={onCancel}>
              Đóng
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Hủy
            </Button>
            <Button type="button" onClick={submit(false)} disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu'}
            </Button>
            {!voucherId && (
              <Button type="button" variant="secondary" onClick={submit(true)} disabled={saving}>
                Lưu và Thêm
              </Button>
            )}
          </>
        )}
      </div>

      <QuickAddPartnerDialog
        open={supplierDialog}
        onClose={() => setSupplierDialog(false)}
        kind="supplier"
        initialCode={supplierKw.trim() || undefined}
        onCreated={(p) => {
          setSupplierKw('')
          selectSupplier(p)
        }}
      />
    </form>
  )
}

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
