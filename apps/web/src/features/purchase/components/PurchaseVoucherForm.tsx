import {
  CHART_OF_ACCOUNTS,
  PartnerType,
  PurchaseOrigin,
  PurchasePaymentMode,
  PurchaseVoucherType,
  type CreatePurchaseVoucherInput,
} from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useEmployeeOptions } from '@/shared/api/useEmployeeOptions'
import { useItemOptions } from '@/shared/api/useItemOptions'
import { getApiErrorMessage } from '@/shared/lib/api'
import { invalidToast } from '@/shared/lib/form'
import { cn } from '@/shared/lib/cn'
import { formatCurrency } from '@/shared/lib/currency'
import { AccountPicker, accountCellCls } from '@/shared/ui/account-picker'
import { Button } from '@/shared/ui/button'
import { PlusIcon, TrashIcon, XIcon } from '@/shared/ui/icons'
import { ItemPicker, type ItemOption } from '@/shared/ui/item-picker'
import { PartnerPicker, type PartnerOption } from '@/shared/ui/partner-picker'
import { QuickAddEmployeeDialog } from '@/shared/ui/quick-add-employee-dialog'
import { QuickAddPartnerDialog } from '@/shared/ui/quick-add-partner-dialog'
import { WarehousePicker, warehouseCellCls } from '@/shared/ui/warehouse-picker'
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
  PAYMENT_MODE_LABEL,
  PURCHASE_PAYMENT_METHODS,
  PURCHASE_TYPE_OPTIONS,
  VOUCHER_TYPE_LABEL,
  hasWarehouse,
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
  // Nút hành động thêm ở action bar khi xem (vd. Sửa nhanh / Bỏ ghi) — page truyền vào.
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

function emptyLine(
  type: PurchaseVoucherType,
  // Trả ngay tiền mặt → vế Có là quỹ 1111 thay công nợ 331 (khớp định khoản backend).
  payableAccount: string = CHART_OF_ACCOUNTS.PAYABLE,
): PurchaseLineFormValues {
  return {
    quantity: 1,
    unitPrice: 0,
    vatRate: 8,
    stockAccount: defaultStockAccount(type),
    payableAccount,
    vatAccount: CHART_OF_ACCOUNTS.VAT_INPUT_DEDUCTIBLE,
  }
}

function defaultValues(type: PurchaseVoucherType): PurchaseVoucherFormValues {
  return {
    type,
    origin: PurchaseOrigin.Domestic,
    paymentMode: PurchasePaymentMode.Unpaid,
    receiveWithInvoice: false,
    postingDate: today(),
    voucherDate: today(),
    description: 'Mua hàng',
    purchaseCost: 0,
    lines: [emptyLine(type)],
  }
}

// Nhãn số chứng từ + tab đầu theo loại (MISA: nhập kho gọi là "Phiếu nhập").
const voucherNoLabel = (t: PurchaseVoucherType) =>
  t === PurchaseVoucherType.Stock ? 'Số phiếu nhập' : 'Số chứng từ'
const mainTabLabel = (t: PurchaseVoucherType) =>
  t === PurchaseVoucherType.Stock ? 'Phiếu nhập' : 'Chứng từ'

// Trang chứng từ mua hàng — bố cục §5 design.md: page header (loại nghiệp vụ) →
// sub-header (tùy chọn TT + tổng tiền) → tabs → form body cuộn → action bar sticky.
// Form tự dựng cả 3 tầng (không dùng RecordPageShell) vì header/sub-header cần
// đọc-ghi trực tiếp state form (loại, số hợp đồng, tùy chọn thanh toán, tổng tiền).
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
  const { control, register, handleSubmit, reset, watch, setValue, getValues, formState } = form
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'lines' })

  // Tab bản ghi (§5.4) + tab bảng dòng hàng (§5.6) + toggle cột tài khoản (§5.7).
  const [tab, setTab] = useState<'main' | 'invoice'>('main')
  const [lineTab, setLineTab] = useState<'goods' | 'cost'>('goods')
  const [showAccounts, setShowAccounts] = useState(true)

  // Preview số chứng từ kế tiếp khi tạo mới — số thật vẫn cấp lúc Lưu.
  // Số đổi theo tùy chọn thanh toán: MH/MDV trả ngay tiền mặt → PC, còn lại → NK/MH/MDV.
  // Số theo loại đang chọn trong form (dropdown đổi được), không theo prop khởi tạo.
  const nextNo = useNextPurchaseVoucherNo(
    watch('type'),
    watch('voucherDate'),
    watch('paymentMode'),
    !voucherId,
  )

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

  // Picker nhân viên mua hàng (+ tạo nhanh) — cùng pattern chứng từ thu/chi.
  const [employeeKw, setEmployeeKw] = useState('')
  const { items: employeeItems, loading: employeeLoading } = useEmployeeOptions(employeeKw)
  const [employeeDialog, setEmployeeDialog] = useState(false)

  // Tạo nhanh nhà cung cấp (dialog mở từ nút + trên picker).
  const [supplierDialog, setSupplierDialog] = useState(false)
  const selectSupplier = (p: PartnerOption) => {
    setValue('supplierId', p.code)
    setValue('supplierName', p.name)
    if (p.address) setValue('address', p.address)
  }

  // Chọn VTHH ở ô Mã hàng → điền dòng hàng theo dữ liệu ngầm định của danh mục
  // (tên, ĐVT, kho ngầm định, TK Kho, đơn giá mua gần nhất, % thuế GTGT) — như MISA.
  // Gõ mã ngoài danh mục vẫn được: chỉ có `code`, các trường khác giữ nguyên.
  const pickItem = (i: number, item: ItemOption) => {
    setValue(`lines.${i}.itemId`, item.code)
    if (item.name) setValue(`lines.${i}.itemName`, item.name)
    if (item.unit) setValue(`lines.${i}.unit`, item.unit)
    if (item.defaultWarehouseCode) setValue(`lines.${i}.warehouseId`, item.defaultWarehouseCode)
    if (item.inventoryAccount) setValue(`lines.${i}.stockAccount`, item.inventoryAccount)
    const price = Number(item.purchasePrice)
    // Chỉ gợi ý đơn giá khi dòng còn trống — không đè giá người dùng đã nhập.
    if (Number.isFinite(price) && price > 0 && !getValues(`lines.${i}.unitPrice`))
      setValue(`lines.${i}.unitPrice`, price)
    // vatRate trong danh mục là text MISA ("10" / "8" / "KCT" / …) — chỉ nhận số.
    const vat = Number(item.vatRate)
    if (item.vatRate && Number.isFinite(vat)) setValue(`lines.${i}.vatRate`, vat)
  }

  // Nạp dữ liệu khi sửa.
  useEffect(() => {
    const v = editing.data
    if (!v) return
    reset({
      type: v.type,
      origin: v.origin,
      paymentMode: v.paymentMode,
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

  // Trả ngay tiền mặt → TK công nợ dòng hàng đổi 331 → 1111 và ngược lại (MISA
  // đổi tự động); chỉ đè giá trị mặc định, giữ TK người dùng đã sửa tay.
  const paysCash = paymentMode === PurchasePaymentMode.Immediate
  const linePayableDefault = paysCash ? CHART_OF_ACCOUNTS.CASH_ON_HAND : CHART_OF_ACCOUNTS.PAYABLE
  useEffect(() => {
    const defaults: string[] = [CHART_OF_ACCOUNTS.PAYABLE, CHART_OF_ACCOUNTS.CASH_ON_HAND]
    getValues('lines')?.forEach((l, i) => {
      if (l.payableAccount !== linePayableDefault && defaults.includes(l.payableAccount ?? ''))
        setValue(`lines.${i}.payableAccount`, linePayableDefault)
    })
  }, [linePayableDefault, getValues, setValue])

  // Loại chứng từ là trạng thái form (đổi qua dropdown loại nghiệp vụ), không dùng prop cố định.
  const currentType = watch('type')
  const showWarehouse = hasWarehouse(currentType)

  // Đổi loại nghiệp vụ → TK Kho/chi phí mặc định của dòng hàng đổi theo
  // (156 nhập kho ↔ 642 dịch vụ); giữ TK người dùng đã sửa tay.
  const lineStockDefault = defaultStockAccount(currentType)
  useEffect(() => {
    const defaults: string[] = [CHART_OF_ACCOUNTS.GOODS, CHART_OF_ACCOUNTS.SERVICE_EXPENSE]
    getValues('lines')?.forEach((l, i) => {
      if (l.stockAccount !== lineStockDefault && defaults.includes(l.stockAccount ?? ''))
        setValue(`lines.${i}.stockAccount`, lineStockDefault)
    })
  }, [lineStockDefault, getValues, setValue])
  const isUnpaid = paymentMode === PurchasePaymentMode.Unpaid

  // §10.2 tổng hợp.
  const totalQty = lines?.reduce((s, l) => s + (l.quantity || 0), 0) ?? 0
  const totalGoods = lines?.reduce((s, l) => s + (l.quantity || 0) * (l.unitPrice || 0), 0) ?? 0
  const totalVat =
    lines?.reduce(
      (s, l) => s + ((l.quantity || 0) * (l.unitPrice || 0) * (l.vatRate || 0)) / 100,
      0,
    ) ?? 0
  const totalPayment = totalGoods + totalVat
  const stockValue = totalGoods + (purchaseCost || 0)

  // Số cột trước "Thành tiền" (dòng Tổng cộng) — đổi theo cột Kho / cột TK đang hiện.
  const leadCols = 3 + (showWarehouse ? 1 : 0) + (showAccounts ? 2 : 0) + 1 // #, mã, tên, [kho], [TK Kho, TK CN], ĐVT

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
        if (voucherId) {
          // Sửa phiếu không cho đổi loại (type) — backend từ chối field thừa (forbidNonWhitelisted).
          const { type: _type, ...updateDto } = dto
          await update.mutateAsync({ id: voucherId, dto: updateDto })
        } else await create.mutateAsync(dto)
        if (goNext && !voucherId) {
          // Giữ nguyên loại + tùy chọn thanh toán đang chọn khi lưu và thêm tiếp.
          reset({
            ...defaultValues(values.type),
            origin: values.origin,
            paymentMode: values.paymentMode,
          })
        } else onSaved()
      } catch (e) {
        toast({
          variant: 'error',
          title: 'Lưu chứng từ thất bại',
          description: getApiErrorMessage(e),
        })
      }
    }, invalidToast(toast)) // toast lỗi validate — tránh bấm Lưu không thấy phản hồi

  const saving = create.isPending || update.isPending
  const displayNo = editing.data?.voucherNo ?? nextNo.data ?? ''

  return (
    <form className="flex h-screen flex-col bg-white">
      {/* ── Page header (§5.2): tiêu đề + số CT · loại nghiệp vụ · số hợp đồng · ✕ ── */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <h1 className="shrink-0 whitespace-nowrap text-lg font-bold text-slate-800">
          Chứng từ mua hàng <span className="text-primary">{displayNo}</span>
        </h1>
        <Select
          value={currentType}
          disabled={readOnly || !!voucherId}
          onValueChange={(v) => setValue('type', v as PurchaseVoucherType)}
        >
          <SelectTrigger className="h-9 w-80 shrink-0" title="Loại nghiệp vụ">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PURCHASE_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>
                {VOUCHER_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          {...register('contractNo')}
          disabled={readOnly}
          placeholder="Nhập số hợp đồng mua …"
          className={cn(inputCls, 'w-56 shrink-0')}
        />
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Đóng"
        >
          <XIcon size={18} />
        </button>
      </header>

      {/* ── Sub-header (§5.3): tùy chọn thanh toán · phương thức · nhận kèm HĐ | tổng tiền ── */}
      <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-border bg-slate-50 px-4 py-2">
        <fieldset disabled={readOnly} className="flex flex-wrap items-center gap-4">
          {[PurchasePaymentMode.Unpaid, PurchasePaymentMode.Immediate].map((m) => (
            <label key={m} className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                value={m}
                checked={paymentMode === m}
                onChange={() => setValue('paymentMode', m)}
              />
              {PAYMENT_MODE_LABEL[m]}
            </label>
          ))}
          {/* Phương thức TT chỉ có nghĩa khi trả ngay; hiện chỉ hỗ trợ tiền mặt. */}
          <Select value="CASH" disabled>
            <SelectTrigger
              className={cn('h-8 w-40 bg-white', paysCash ? '' : 'invisible')}
              title="Hiện chỉ hỗ trợ thanh toán ngay bằng tiền mặt"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PURCHASE_PAYMENT_METHODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" {...register('receiveWithInvoice')} />
            Nhận kèm hóa đơn
          </label>
        </fieldset>
        <div className="ml-auto text-right">
          <div className="text-xs text-slate-500">Tổng tiền thanh toán</div>
          <div className="text-2xl font-bold tabular-nums text-primary">
            {formatCurrency(totalPayment)}
          </div>
        </div>
      </div>

      {/* ── Tabs bản ghi (§5.4) ── */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-4">
        {(
          [
            { key: 'main', label: mainTabLabel(currentType) },
            { key: 'invoice', label: 'Hóa đơn' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'border-b-2 px-3 py-2 text-sm transition-colors',
              tab === t.key
                ? 'border-primary font-medium text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Form body (§5.5) — cuộn dọc ── */}
      <fieldset
        disabled={readOnly}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-3 disabled:opacity-90"
      >
        {/* Chứng từ tự sinh: Phiếu chi (trả ngay tiền mặt) / Phiếu nhập kho. */}
        {!!voucherId && !!(editing.data?.paymentId || editing.data?.receiptId) && (
          <p className="space-x-3 text-sm text-slate-600">
            <span>Tham chiếu:</span>
            {editing.data?.paymentId && (
              <Link
                to={`/cash/vouchers/${editing.data.paymentId}`}
                className="font-medium text-primary hover:underline"
              >
                {editing.data.paymentNo ?? 'Phiếu chi'}
              </Link>
            )}
            {editing.data?.receiptId && (
              <Link
                to={`/inventory/receipts/${editing.data.receiptId}`}
                className="font-medium text-primary hover:underline"
              >
                {editing.data.receiptNo ?? 'Phiếu nhập kho'}
              </Link>
            )}
          </p>
        )}

        {tab === 'invoice' ? (
          // Tab Hóa đơn — thông tin hóa đơn mua hàng (chỉ có nghĩa khi nhận kèm HĐ).
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
            <Field label="Số hóa đơn">
              <input {...register('invoiceNo')} className={inputCls} />
            </Field>
            {!receiveWithInvoice && (
              <p className="self-end pb-2 text-xs text-slate-500 md:col-span-2">
                Bật “Nhận kèm hóa đơn” ở dải trên nếu hóa đơn về cùng hàng.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Lưới trường 3 cụm: NCC | tên/địa chỉ/diễn giải | ngày + số CT (§5.5) */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
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
              <Field label="Ngày hạch toán" error={formState.errors.postingDate?.message}>
                <input type="date" {...register('postingDate')} className={inputCls} />
              </Field>

              <Field label="Người giao hàng">
                <input {...register('deliverer')} className={inputCls} />
              </Field>
              <Field label="Địa chỉ">
                <input {...register('address')} className={inputCls} />
              </Field>
              <Field label="Ngày chứng từ" error={formState.errors.voucherDate?.message}>
                <input type="date" {...register('voucherDate')} className={inputCls} />
              </Field>

              <Field label="Nhân viên mua hàng">
                <PartnerPicker
                  value={watch('employeeId')}
                  items={employeeItems}
                  loading={employeeLoading}
                  keyword={employeeKw}
                  onKeywordChange={setEmployeeKw}
                  placeholder="Mã nhân viên"
                  onSelect={(p) => setValue('employeeId', p.code)}
                  onAddNew={() => setEmployeeDialog(true)}
                />
              </Field>
              <Field label="Diễn giải">
                <input {...register('description')} className={inputCls} />
              </Field>
              <Field label={voucherNoLabel(currentType)}>
                <input
                  value={displayNo || 'Tự động'}
                  readOnly
                  title="Số dự kiến — cấp chính thức khi Lưu"
                  className={cn(inputCls, 'bg-slate-50 text-slate-500')}
                />
              </Field>

              <Field label="Kèm theo (chứng từ gốc)">
                <input type="number" min={0} {...register('attachmentCount')} className={inputCls} />
              </Field>
            </div>

            {/* Điều khoản thanh toán chỉ có nghĩa khi còn nợ (chưa thanh toán) */}
            {isUnpaid && (
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-md bg-slate-50 px-3 py-2 md:grid-cols-3">
                <Field label="Điều khoản thanh toán">
                  <input {...register('paymentTermId')} className={inputCls} />
                </Field>
                <Field label="Số ngày được nợ">
                  <input type="number" min={0} {...register('creditDays')} className={inputCls} />
                </Field>
                <Field label="Hạn thanh toán">
                  <input type="date" {...register('dueDate')} className={inputCls} />
                </Field>
              </div>
            )}

            {/* ── Line section (§5.6): sub-tabs + toolbar + bảng dòng hàng ── */}
            <div className="rounded-md border border-border">
              <div className="flex items-center gap-1 border-b border-border bg-slate-50 px-2">
                {(
                  [
                    { key: 'goods', label: 'Hàng tiền' },
                    { key: 'cost', label: 'Chi phí' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setLineTab(t.key)}
                    className={cn(
                      'border-b-2 px-3 py-1.5 text-sm transition-colors',
                      lineTab === t.key
                        ? 'border-primary font-medium text-primary'
                        : 'border-transparent text-slate-500 hover:text-slate-700',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
                {/* Chiết khấu chưa hỗ trợ — giữ chỗ đúng vị trí toolbar của MISA. */}
                <div className="ml-auto flex items-center gap-2 py-1">
                  <span className="text-xs text-slate-500">Chiết khấu</span>
                  <Select value="NONE" disabled>
                    <SelectTrigger className="h-8 w-44 bg-white" title="Chiết khấu chưa hỗ trợ">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Không chiết khấu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {lineTab === 'cost' ? (
                <div className="px-3 py-6 text-center text-sm text-slate-500">
                  Phân bổ chi phí mua hàng theo dòng đang phát triển — nhập tổng ở ô{' '}
                  <span className="font-medium">Chi phí mua hàng</span> bên dưới.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px] border-collapse text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="w-8 px-2 py-1.5 text-center">#</th>
                          <th className="px-2 py-1.5">Mã hàng</th>
                          <th className="px-2 py-1.5">Tên hàng</th>
                          {showWarehouse && <th className="px-2 py-1.5">Kho</th>}
                          {showAccounts && <th className="w-24 px-2 py-1.5">TK Kho</th>}
                          {showAccounts && <th className="w-24 px-2 py-1.5">TK Công nợ</th>}
                          <th className="w-16 px-2 py-1.5">ĐVT</th>
                          <th className="w-20 px-2 py-1.5 text-right">Số&nbsp;lượng</th>
                          <th className="w-28 px-2 py-1.5 text-right">Đơn&nbsp;giá</th>
                          <th className="w-32 px-2 py-1.5 text-right">Thành&nbsp;tiền</th>
                          <th className="w-16 px-2 py-1.5 text-right">%&nbsp;Thuế&nbsp;GTGT</th>
                          <th className="w-28 px-2 py-1.5 text-right">Tiền&nbsp;thuế&nbsp;GTGT</th>
                          {showAccounts && <th className="w-24 px-2 py-1.5">TK thuế GTGT</th>}
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
                                <ItemCell value={l?.itemId} onPick={(item) => pickItem(i, item)} />
                              </td>
                              <td className="px-2 py-1">
                                <input {...register(`lines.${i}.itemName`)} className={cellCls} />
                              </td>
                              {showWarehouse && (
                                <td className="px-2 py-1">
                                  <Controller
                                    control={control}
                                    name={`lines.${i}.warehouseId`}
                                    render={({ field }) => (
                                      <WarehousePicker
                                        value={field.value}
                                        onChange={field.onChange}
                                        inputClassName={warehouseCellCls}
                                      />
                                    )}
                                  />
                                </td>
                              )}
                              {showAccounts && (
                                <td className="px-2 py-1">
                                  <Controller
                                    control={control}
                                    name={`lines.${i}.stockAccount`}
                                    render={({ field }) => (
                                      <AccountPicker
                                        value={field.value}
                                        onChange={field.onChange}
                                        inputClassName={accountCellCls}
                                      />
                                    )}
                                  />
                                </td>
                              )}
                              {showAccounts && (
                                <td className="px-2 py-1">
                                  <Controller
                                    control={control}
                                    name={`lines.${i}.payableAccount`}
                                    render={({ field }) => (
                                      <AccountPicker
                                        value={field.value}
                                        onChange={field.onChange}
                                        inputClassName={accountCellCls}
                                      />
                                    )}
                                  />
                                </td>
                              )}
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
                              {showAccounts && (
                                <td className="px-2 py-1">
                                  <Controller
                                    control={control}
                                    name={`lines.${i}.vatAccount`}
                                    render={({ field }) => (
                                      <AccountPicker
                                        value={field.value}
                                        onChange={field.onChange}
                                        inputClassName={accountCellCls}
                                      />
                                    )}
                                  />
                                </td>
                              )}
                              <td className="px-2 py-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => fields.length > 1 && remove(i)}
                                  className="text-slate-400 hover:text-red-600"
                                  aria-label="Xóa dòng"
                                >
                                  <TrashIcon size={14} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="bg-slate-100 font-medium">
                        <tr className="border-t border-border">
                          <td className="px-2 py-1.5" colSpan={leadCols}>
                            Tổng cộng
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{totalQty}</td>
                          <td />
                          <td className="px-2 py-1.5 text-right tabular-nums">
                            {formatCurrency(totalGoods)}
                          </td>
                          <td />
                          <td className="px-2 py-1.5 text-right tabular-nums">
                            {formatCurrency(totalVat)}
                          </td>
                          <td colSpan={showAccounts ? 2 : 1} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Nút dòng (§5.6) */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-border px-2 py-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append(emptyLine(currentType, linePayableDefault))}
                    >
                      <PlusIcon size={14} /> Thêm dòng
                    </Button>
                    {/* Ghi chú = dòng chỉ có Tên hàng, SL/đơn giá 0 → không đổi tổng tiền. */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({
                          ...emptyLine(currentType, linePayableDefault),
                          quantity: 0,
                          unitPrice: 0,
                          vatRate: 0,
                        })
                      }
                    >
                      Thêm ghi chú
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => replace([emptyLine(currentType, linePayableDefault)])}
                    >
                      Xóa hết dòng
                    </Button>
                    <span className="ml-auto text-xs text-slate-500">
                      Tổng số: {fields.length} bản ghi
                    </span>
                  </div>
                </>
              )}
            </div>

            {typeof formState.errors.lines?.message === 'string' && (
              <p className="text-sm text-red-600">{formState.errors.lines.message}</p>
            )}

            {/* Tra cứu HĐĐT (trái) + summary (phải) — thứ tự số như MISA (§5.6) */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="grid w-full max-w-xl grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
                <Field label="Mã tra cứu HĐĐT">
                  <input {...register('einvoiceLookupCode')} className={inputCls} />
                </Field>
                <Field label="Đường dẫn tra cứu HĐĐT">
                  <input {...register('einvoiceLookupUrl')} className={inputCls} />
                </Field>
              </div>

              <div className="grid w-full max-w-sm grid-cols-2 gap-y-1.5 text-sm">
                <span className="text-slate-500">Tổng tiền hàng</span>
                <span className="text-right tabular-nums">{formatCurrency(totalGoods)}</span>
                <span className="text-slate-500">Thuế GTGT</span>
                <span className="text-right tabular-nums">{formatCurrency(totalVat)}</span>
                <span className="font-semibold text-slate-700">Tổng tiền thanh toán</span>
                <span className="text-right font-semibold tabular-nums text-primary">
                  {formatCurrency(totalPayment)}
                </span>
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
              </div>
            </div>
          </>
        )}
      </fieldset>

      {/* ── Action bar (§5.7): toggle cột tài khoản | nút hành động ── */}
      <div className="flex shrink-0 items-center gap-3 border-t border-border px-4 py-2.5">
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showAccounts}
            onChange={(e) => setShowAccounts(e.target.checked)}
          />
          Hiển thị tài khoản
        </label>
        <div className="ml-auto flex gap-2">
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
              {!voucherId && (
                <Button type="button" variant="secondary" onClick={submit(true)} disabled={saving}>
                  Lưu và Thêm
                </Button>
              )}
              <Button type="button" onClick={submit(false)} disabled={saving}>
                {saving ? 'Đang lưu…' : voucherId ? 'Lưu' : 'Lưu và Đóng'}
              </Button>
            </>
          )}
        </div>
      </div>

      <QuickAddEmployeeDialog
        open={employeeDialog}
        onClose={() => setEmployeeDialog(false)}
        initialCode={employeeKw.trim() || undefined}
        onCreated={(p) => {
          setEmployeeKw('')
          setValue('employeeId', p.code)
        }}
      />

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

// Ô Mã hàng: combobox tra cứu VTHH, keyword riêng theo từng dòng.
function ItemCell({ value, onPick }: { value?: string; onPick: (item: ItemOption) => void }) {
  const [keyword, setKeyword] = useState('')
  const { items, loading } = useItemOptions(keyword)
  return (
    <ItemPicker
      value={value}
      items={items}
      loading={loading}
      keyword={keyword}
      onKeywordChange={setKeyword}
      onSelect={onPick}
      placeholder="Mã hàng"
      inputClassName={cellCls}
      allowFreeText
    />
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
