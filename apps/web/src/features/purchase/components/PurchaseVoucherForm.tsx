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
import { num } from '@/shared/lib/num'
import { formatCurrency } from '@/shared/lib/currency'
import { formatDate } from '@/shared/lib/report-period'
import { AccountPicker, accountCellCls } from '@/shared/ui/account-picker'
import { Button } from '@/shared/ui/button'
import { PlusIcon, TrashIcon, XIcon } from '@/shared/ui/icons'
import { ItemPicker, type ItemOption } from '@/shared/ui/item-picker'
import { PartnerPicker, type PartnerOption } from '@/shared/ui/partner-picker'
import { QuickAddEmployeeDialog } from '@/shared/ui/quick-add-employee-dialog'
import { QuickAddPartnerDialog } from '@/shared/ui/quick-add-partner-dialog'
import { WarehousePicker, warehouseCellCls } from '@/shared/ui/warehouse-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { useToast } from '@/shared/ui/toast'
import { AmountInput } from '@/shared/ui/amount-input'
import { Input } from '@/shared/ui/input'
import { Field } from '@/shared/ui/field'
import { CheckboxField } from '@/shared/ui/checkbox-field'
import { CellInput, cellInputCls } from '@/shared/ui/cell-input'
import { Label } from '@/shared/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'
import { CostVoucherPickerDialog } from './CostVoucherPickerDialog'
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
  FORM_VARIANT,
  PAYMENT_MODE_LABEL,
  PURCHASE_PAYMENT_METHODS,
  PURCHASE_TYPE_OPTIONS,
  VOUCHER_TYPE_LABEL,
  hasWarehouse,
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
import { TabBar } from '@/shared/ui/tab-bar'
import { RecordFormSkeleton } from '@/shared/ui/record-skeleton'

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
    isPurchaseCost: false,
    postingDate: today(),
    voucherDate: today(),
    supplierName: '',
    description: FORM_VARIANT[type].descriptionDefault,
    purchaseCost: 0,
    costAllocations: [],
    lines: [emptyLine(type)],
  }
}

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
  // Bảng phân bổ chi phí (tab Chi phí, §10.4).
  const costArray = useFieldArray({ control, name: 'costAllocations' })

  // Tab bản ghi (§5.4). Cột tài khoản luôn hiện (đã bỏ toggle "Hiển thị tài khoản").
  const [tab, setTab] = useState<'main' | 'invoice'>('main')
  const showAccounts = true
  // Sub-tab vùng bảng (MISA): Hàng tiền/Hạch toán | Chi phí (mua hàng) | Thuế (mua dịch vụ).
  const [lineTab, setLineTab] = useState<'money' | 'cost' | 'tax'>('money')
  const [costDialog, setCostDialog] = useState(false)

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
    // Tự sinh Diễn giải theo NCC ("Mua hàng của X") — như MISA, cùng pattern BankVoucherForm.
    setValue('description', `${FORM_VARIANT[getValues('type')].descriptionDefault} của ${p.name}`)
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
      isPurchaseCost: v.isPurchaseCost,
      invoiceTemplate: v.invoiceTemplate ?? undefined,
      invoiceSeries: v.invoiceSeries ?? undefined,
      invoiceNo: v.invoiceNo ?? undefined,
      invoiceDate: v.invoiceDate ?? undefined,
      // Nhân bản → ngày về hôm nay (chứng từ mới), sửa → giữ nguyên ngày gốc.
      postingDate: duplicating ? today() : v.postingDate.slice(0, 10),
      voucherDate: duplicating ? today() : v.voucherDate.slice(0, 10),
      // Picker Mã NCC làm việc bằng MÃ danh mục — supplierId của DTO là row id.
      supplierId: v.supplierCode ?? undefined,
      supplierName: v.supplierName ?? '',
      deliverer: v.deliverer ?? undefined,
      address: v.address ?? undefined,
      employeeId: v.employeeId ?? undefined,
      description: v.description ?? undefined,
      attachmentCount: v.attachmentCount,
      contractNo: v.contractNo ?? undefined,
      paymentTermId: v.paymentTermId ?? undefined,
      creditDays: v.creditDays ?? undefined,
      dueDate: v.dueDate ?? undefined,
      purchaseCost: duplicating ? 0 : Number(v.purchaseCost),
      // Nhân bản KHÔNG copy phân bổ chi phí: lũy kế của chứng từ CP sẽ vượt
      // tổng chi phí → lưu bị từ chối; người dùng tự phân bổ lại nếu cần.
      costAllocations: duplicating
        ? []
        : (v.costAllocations ?? []).map((a) => ({
            costVoucherId: a.costVoucherId,
            voucherNo: a.voucherNo,
            postingDate: a.postingDate,
            voucherDate: a.voucherDate,
            supplierName: a.supplierName,
            totalCost: Number(a.totalCost),
            allocatedOther: Number(a.allocatedTotal) - Number(a.amount),
            amount: Number(a.amount),
          })),
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
  const paymentMode = watch('paymentMode')
  const receiveWithInvoice = watch('receiveWithInvoice')
  // Chi phí mua hàng = Σ phân bổ (tab Chi phí); chứng từ nhập khẩu Excel không
  // có phân bổ → rơi về số scalar đã lưu.
  const costAllocs = watch('costAllocations')
  const purchaseCostValue = costAllocs?.length
    ? costAllocs.reduce((s, a) => s + num(a.amount), 0)
    : num(watch('purchaseCost'))

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
  // Nhãn/trường hiển thị theo loại (3 màn hình MISA: nhập kho / ghi nợ / dịch vụ).
  const variant = FORM_VARIANT[currentType]
  // Có tab Thuế riêng (dịch vụ) → tab Hạch toán ẩn cột thuế GTGT (MISA tách 2 view).
  const vatInline = !variant.hasTaxTab
  const lineTabs: ('money' | 'cost' | 'tax')[] = [
    'money',
    ...(variant.hasCostTab ? (['cost'] as const) : []),
    ...(variant.hasTaxTab ? (['tax'] as const) : []),
  ]

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
  const totalQty = lines?.reduce((s, l) => s + num(l.quantity), 0) ?? 0
  const totalGoods = lines?.reduce((s, l) => s + num(l.quantity) * num(l.unitPrice), 0) ?? 0
  const totalVat =
    lines?.reduce((s, l) => s + (num(l.quantity) * num(l.unitPrice) * num(l.vatRate)) / 100, 0) ?? 0
  const totalPayment = totalGoods + totalVat
  const stockValue = totalGoods + purchaseCostValue

  // Số cột trước "Thành tiền" (dòng Tổng cộng) — đổi theo cột Kho / cột TK đang hiện.
  const leadCols = 3 + (showWarehouse ? 1 : 0) + (showAccounts ? 2 : 0) + 1 // #, mã, tên, [kho], [TK Kho, TK CN], ĐVT

  const submit = (goNext: boolean) =>
    handleSubmit(async (values) => {
      const dto: CreatePurchaseVoucherInput = {
        ...values,
        // Input date bỏ trống trả chuỗi rỗng — backend @IsDateString từ chối "".
        invoiceDate: values.invoiceDate || undefined,
        dueDate: values.dueDate || undefined,
        // Chỉ gửi costVoucherId + amount — field hiển thị (số CT, NCC…) backend từ chối.
        costAllocations: values.costAllocations?.map((a) => ({
          costVoucherId: a.costVoucherId,
          amount: a.amount,
        })),
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

  // Chờ nạp chứng từ — tránh chớp form rỗng rồi mới điền dữ liệu.
  if (editing.isLoading) return <RecordFormSkeleton withHeader />

  return (
    <form className="flex h-screen flex-col bg-white">
      {/* ── Page header (§5.2): tiêu đề + số CT · loại nghiệp vụ · số hợp đồng · ✕ — nền primary nhạt (2 lớp màu, đồng bộ cash) ── */}
      <header className="flex h-14 shrink-0 items-center gap-3 bg-primary/5 px-4">
        <h1 className="shrink-0 whitespace-nowrap text-lg font-bold text-slate-800">
          {variant.title} <span className="text-primary">{displayNo}</span>
        </h1>
        {/* Mua dịch vụ là loại chứng từ riêng — không có dropdown lý do như mua hàng. */}
        {currentType !== PurchaseVoucherType.Service && (
          <Select
            value={currentType}
            disabled={readOnly || !!voucherId}
            onValueChange={(v) => setValue('type', v as PurchaseVoucherType)}
          >
            <SelectTrigger className="h-9 w-80 shrink-0 bg-white" title="Loại nghiệp vụ">
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
        )}
        <Input
          {...register('contractNo')}
          disabled={readOnly}
          placeholder={variant.contractPlaceholder}
          className="w-56 shrink-0"
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
      <div className="flex shrink-0 flex-wrap items-center gap-4 bg-primary/5 px-4 py-2">
        <fieldset disabled={readOnly} className="flex flex-wrap items-center gap-4">
          <RadioGroup
            value={paymentMode}
            onValueChange={(v) => setValue('paymentMode', v as typeof paymentMode)}
            className="flex items-center gap-4"
          >
            {[PurchasePaymentMode.Unpaid, PurchasePaymentMode.Immediate].map((m) => (
              <div key={m} className="flex items-center gap-1.5">
                <RadioGroupItem value={m} id={`purchase-payment-mode-${m}`} />
                <Label
                  htmlFor={`purchase-payment-mode-${m}`}
                  className="cursor-pointer font-normal"
                >
                  {PAYMENT_MODE_LABEL[m]}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {/* Phương thức TT chỉ có nghĩa khi trả ngay; hiện chỉ hỗ trợ tiền mặt.
              MISA luôn hiện dropdown, xám khi "Chưa thanh toán". */}
          <Select value="CASH" disabled>
            <SelectTrigger
              className={cn('h-8 w-40', paysCash ? 'bg-white' : 'bg-slate-100 text-slate-500')}
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
          {/* MISA để dropdown (Nhận kèm / Không kèm / Không có hóa đơn); backend mới có
              boolean nhận kèm nên chỉ 2 lựa chọn — "Không có hóa đơn" cần enum riêng. */}
          <Select
            value={receiveWithInvoice ? 'WITH' : 'WITHOUT'}
            disabled={readOnly}
            onValueChange={(v) => setValue('receiveWithInvoice', v === 'WITH')}
          >
            <SelectTrigger className="h-8 w-48 bg-white" title="Hóa đơn nhận kèm chứng từ">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WITH">Nhận kèm hóa đơn</SelectItem>
              <SelectItem value="WITHOUT">Không kèm hóa đơn</SelectItem>
            </SelectContent>
          </Select>
          {/* MISA: chỉ chứng từ dịch vụ đánh dấu cờ này mới được chọn phân bổ CP (§10.4). */}
          {variant.hasCostFlag && (
            <CheckboxField control={control} name="isPurchaseCost" label="Là chi phí mua hàng" />
          )}
        </fieldset>
        <div className="ml-auto text-right">
          <div className="text-xs text-slate-500">Tổng tiền thanh toán</div>
          <div className="text-2xl font-bold tabular-nums text-primary">
            {formatCurrency(totalPayment)}
          </div>
        </div>
      </div>

      {/* ── Tabs bản ghi (§5.4) — vẫn thuộc lớp tint; mua dịch vụ không có tab
          Hóa đơn (MISA: thông tin HĐ nằm trong sub-tab Thuế) ── */}
      {variant.hasInvoiceTab && (
        <TabBar
          value={tab}
          onChange={setTab}
          items={[
            { key: 'main', label: variant.mainTab },
            { key: 'invoice', label: 'Hóa đơn' },
          ]}
          className="shrink-0 border-b border-border bg-primary/5 px-4"
        />
      )}

      {/* ── Form body (§5.5) — cuộn dọc, 2 lớp màu: thông tin chung tint / bảng hàng trắng ── */}
      <fieldset disabled={readOnly} className="flex-1 overflow-y-auto disabled:opacity-90">
        <section className="space-y-4 bg-primary/5 px-4 pb-4 pt-3">
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
            // Tab Hóa đơn — thông tin hóa đơn NCC nhận kèm hàng (theo MISA: mẫu số,
            // ký hiệu, số, ngày hóa đơn); chỉ có nghĩa khi nhận kèm HĐ.
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
              <Field label="Mẫu số hóa đơn">
                <Input {...register('invoiceTemplate')} placeholder="VD: 01GTKT0/001" />
              </Field>
              <Field label="Ký hiệu hóa đơn">
                <Input {...register('invoiceSeries')} placeholder="VD: 1C24TYY" />
              </Field>
              <Field label="Số hóa đơn">
                <Input {...register('invoiceNo')} />
              </Field>
              <Field label="Ngày hóa đơn">
                <Input type="date" {...register('invoiceDate')} />
              </Field>
              {!receiveWithInvoice && (
                <p className="self-end pb-2 text-xs text-slate-500 md:col-span-2">
                  Chọn “Nhận kèm hóa đơn” ở dải trên nếu hóa đơn về cùng hàng.
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
                <Field label="Tên nhà cung cấp" error={formState.errors.supplierName?.message}>
                  <Input {...register('supplierName')} />
                </Field>
                <Field label="Ngày hạch toán" error={formState.errors.postingDate?.message}>
                  <Input type="date" {...register('postingDate')} />
                </Field>

                {/* Cột deliverer: nhập kho "Người giao hàng", dịch vụ "Người nhận";
                  không qua kho không có — Địa chỉ giãn 2 cột. */}
                {variant.delivererLabel && (
                  <Field label={variant.delivererLabel}>
                    <Input {...register('deliverer')} />
                  </Field>
                )}
                <Field
                  label="Địa chỉ"
                  className={variant.delivererLabel ? undefined : 'md:col-span-2'}
                >
                  <Input {...register('address')} />
                </Field>
                <Field label="Ngày chứng từ" error={formState.errors.voucherDate?.message}>
                  <Input type="date" {...register('voucherDate')} />
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
                  <Input {...register('description')} />
                </Field>
                <Field label={variant.voucherNoLabel}>
                  <Input
                    value={displayNo || 'Tự động'}
                    readOnly
                    title="Số dự kiến — cấp chính thức khi Lưu"
                    className="bg-slate-50 text-slate-500"
                  />
                </Field>

                {variant.hasAttachment && (
                  <Field label="Kèm theo (chứng từ gốc)">
                    <Input type="number" min={0} {...register('attachmentCount')} />
                  </Field>
                )}
              </div>

              {/* Điều khoản thanh toán chỉ có nghĩa khi còn nợ (chưa thanh toán).
                Ô điều khoản là input tự do — chưa có danh mục điều khoản để chọn. */}
              {isUnpaid && (
                <div className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-md bg-slate-50 px-3 py-2 md:grid-cols-3">
                  <Field label="Điều khoản thanh toán">
                    <Input {...register('paymentTermId')} />
                  </Field>
                  <Field label="Số ngày được nợ">
                    <Input type="number" min={0} {...register('creditDays')} />
                  </Field>
                  <Field label="Hạn thanh toán">
                    <Input type="date" {...register('dueDate')} />
                  </Field>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Lớp nền trắng: bảng dòng hàng + tra cứu HĐĐT + tổng hợp ──
            Hiển thị ở mọi tab bản ghi (như MISA): đổi tab chỉ đổi khối thông tin chung. */}
        <section className="space-y-4 px-4 py-3">
          {/* ── Line section (§5.6): sub-tabs + toolbar + bảng dòng hàng ── */}
          <div className="rounded-md border border-border">
            <div className="flex items-center gap-1 border-b border-border bg-slate-50 px-2">
              {/* Sub-tabs MISA: Hàng tiền/Hạch toán | Chi phí (mua hàng) | Thuế (mua dịch vụ). */}
              <TabBar
                size="sm"
                value={lineTab}
                onChange={setLineTab}
                items={lineTabs.map((t) => ({
                  key: t,
                  label: t === 'money' ? variant.lineTab : t === 'cost' ? 'Chi phí' : 'Thuế',
                }))}
              />
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

            {variant.hasCostTab && lineTab === 'cost' ? (
              // ── Tab Chi phí (§10.4): bảng phân bổ chi phí từ chứng từ mua dịch vụ ──
              <>
                <div className="overflow-x-auto">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8 px-2 py-1.5 text-center">#</TableHead>
                        <TableHead className="px-2 py-1.5">Ngày hạch toán</TableHead>
                        <TableHead className="px-2 py-1.5">Ngày chứng từ</TableHead>
                        <TableHead className="px-2 py-1.5">Số chứng từ</TableHead>
                        <TableHead className="px-2 py-1.5">Nhà cung cấp</TableHead>
                        <TableHead className="w-32 px-2 py-1.5 text-right">Tổng chi phí</TableHead>
                        <TableHead className="w-40 px-2 py-1.5 text-right">
                          Lũy kế số đã phân bổ
                        </TableHead>
                        <TableHead className="w-36 px-2 py-1.5 text-right">
                          Số phân bổ lần này
                        </TableHead>
                        <TableHead className="w-8 px-2 py-1.5" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costArray.fields.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="px-2 py-6 text-center text-slate-500">
                            Chưa có chi phí phân bổ — bấm “Chọn chứng từ CP” để thêm.
                          </TableCell>
                        </TableRow>
                      )}
                      {costArray.fields.map((f, i) => {
                        const a = costAllocs?.[i]
                        return (
                          <TableRow key={f.id}>
                            <TableCell className="px-2 py-1 text-center text-slate-400">
                              {i + 1}
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              {a?.postingDate ? formatDate(a.postingDate) : ''}
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              {a?.voucherDate ? formatDate(a.voucherDate) : ''}
                            </TableCell>
                            <TableCell className="px-2 py-1 font-medium text-primary">
                              {a?.voucherNo}
                            </TableCell>
                            {/* Đối tượng: hiện đầy đủ, không cắt ngắn. */}
                            <TableCell className="min-w-[180px] whitespace-normal break-words px-2 py-1">
                              {a?.supplierName ?? ''}
                            </TableCell>
                            <TableCell className="px-2 py-1 text-right tabular-nums text-slate-700">
                              {formatCurrency(a?.totalCost ?? 0)}
                            </TableCell>
                            <TableCell className="px-2 py-1 text-right tabular-nums text-slate-700">
                              {formatCurrency((a?.allocatedOther || 0) + (a?.amount || 0))}
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              <Controller
                                control={control}
                                name={`costAllocations.${i}.amount`}
                                render={({ field }) => (
                                  <AmountInput
                                    value={field.value ?? 0}
                                    onChange={field.onChange}
                                    className={cellInputCls}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell className="px-2 py-1 text-center">
                              <button
                                type="button"
                                onClick={() => costArray.remove(i)}
                                className="text-slate-400 hover:text-red-600"
                                aria-label="Xóa dòng phân bổ"
                              >
                                <TrashIcon size={14} />
                              </button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                    {costArray.fields.length > 0 && (
                      <TableFooter className="bg-slate-100">
                        <TableRow>
                          <TableCell className="px-2 py-1.5" colSpan={5}>
                            Cộng
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-right tabular-nums">
                            {formatCurrency(
                              (costAllocs ?? []).reduce((s, a) => s + num(a.totalCost), 0),
                            )}
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-right tabular-nums">
                            {formatCurrency(
                              (costAllocs ?? []).reduce(
                                (s, a) => s + num(a.allocatedOther) + num(a.amount),
                                0,
                              ),
                            )}
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-right tabular-nums">
                            {formatCurrency(purchaseCostValue)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableFooter>
                    )}
                  </Table>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-border px-2 py-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCostDialog(true)}
                  >
                    <PlusIcon size={14} /> Chọn chứng từ CP
                  </Button>
                  <span className="ml-auto text-xs text-slate-500">
                    Tổng số: {costArray.fields.length} bản ghi
                  </span>
                </div>
                {(() => {
                  const errs = formState.errors.costAllocations
                  const msg = Array.isArray(errs)
                    ? errs.find(Boolean)?.amount?.message
                    : errs?.message
                  return typeof msg === 'string' ? (
                    <p className="px-2 pb-1.5 text-sm text-red-600">{msg}</p>
                  ) : null
                })()}
              </>
            ) : variant.hasTaxTab && lineTab === 'tax' ? (
              // ── Tab Thuế (MISA mua dịch vụ): thuế GTGT + hóa đơn theo dòng — cùng
              // dòng dữ liệu với tab Hạch toán. Số/Ngày hóa đơn là field header (mọi
              // dòng đồng bộ — Controller controlled); xóa dòng = xóa cả dòng hạch toán. ──
              <div className="overflow-x-auto">
                <Table className="min-w-[1000px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8 px-2 py-1.5 text-center">#</TableHead>
                      <TableHead className="px-2 py-1.5">{variant.itemCodeLabel}</TableHead>
                      <TableHead className="px-2 py-1.5">{variant.itemNameLabel}</TableHead>
                      <TableHead className="w-24 px-2 py-1.5 text-right">
                        %&nbsp;Thuế&nbsp;GTGT
                      </TableHead>
                      <TableHead className="w-32 px-2 py-1.5 text-right">
                        Tiền&nbsp;thuế&nbsp;GTGT
                      </TableHead>
                      {showAccounts && (
                        <TableHead className="w-28 px-2 py-1.5">TK thuế GTGT</TableHead>
                      )}
                      <TableHead className="w-32 px-2 py-1.5">Số hóa đơn</TableHead>
                      <TableHead className="w-36 px-2 py-1.5">Ngày hóa đơn</TableHead>
                      <TableHead className="w-8 px-2 py-1.5" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((f, i) => {
                      const l = lines?.[i]
                      const amount = (l?.quantity || 0) * (l?.unitPrice || 0)
                      const vat = (amount * (l?.vatRate || 0)) / 100
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="px-2 py-1 text-center text-slate-400">
                            {i + 1}
                          </TableCell>
                          <TableCell className="px-2 py-1">
                            <ItemCell
                              value={l?.itemId}
                              placeholder={variant.itemCodeLabel}
                              onPick={(item) => pickItem(i, item)}
                            />
                          </TableCell>
                          <TableCell className="px-2 py-1">
                            <CellInput
                              {...register(`lines.${i}.itemName`)}
                              className={cn(
                                cellInputCls,
                                formState.errors.lines?.[i]?.itemName &&
                                  'rounded ring-1 ring-inset ring-red-500',
                              )}
                            />
                          </TableCell>
                          <TableCell className="px-2 py-1">
                            <CellInput
                              type="number"
                              min={0}
                              max={100}
                              step="any"
                              {...register(`lines.${i}.vatRate`)}
                              className={cn('text-right')}
                            />
                          </TableCell>
                          <TableCell className="px-2 py-1 text-right tabular-nums text-slate-700">
                            {formatCurrency(vat)}
                          </TableCell>
                          {showAccounts && (
                            <TableCell className="px-2 py-1">
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
                            </TableCell>
                          )}
                          <TableCell className="px-2 py-1">
                            <Controller
                              control={control}
                              name="invoiceNo"
                              render={({ field }) => (
                                <CellInput {...field} value={field.value ?? ''} />
                              )}
                            />
                          </TableCell>
                          <TableCell className="px-2 py-1">
                            <Controller
                              control={control}
                              name="invoiceDate"
                              render={({ field }) => (
                                <CellInput type="date" {...field} value={field.value ?? ''} />
                              )}
                            />
                          </TableCell>
                          <TableCell className="px-2 py-1 text-center">
                            <button
                              type="button"
                              onClick={() => fields.length > 1 && remove(i)}
                              className="text-slate-400 hover:text-red-600"
                              aria-label="Xóa dòng"
                            >
                              <TrashIcon size={14} />
                            </button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                  <TableFooter className="bg-slate-100">
                    <TableRow>
                      <TableCell className="px-2 py-1.5" colSpan={4}>
                        Tổng cộng
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right tabular-nums">
                        {formatCurrency(totalVat)}
                      </TableCell>
                      <TableCell colSpan={showAccounts ? 4 : 3} />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table className="min-w-[1000px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8 px-2 py-1.5 text-center">#</TableHead>
                        <TableHead className="px-2 py-1.5">{variant.itemCodeLabel}</TableHead>
                        <TableHead className="px-2 py-1.5">{variant.itemNameLabel}</TableHead>
                        {showWarehouse && <TableHead className="px-2 py-1.5">Kho</TableHead>}
                        {showAccounts && (
                          <TableHead className="w-24 px-2 py-1.5">
                            {variant.stockAccountLabel}
                          </TableHead>
                        )}
                        {showAccounts && (
                          <TableHead className="w-24 px-2 py-1.5">TK Công nợ</TableHead>
                        )}
                        <TableHead className="w-16 px-2 py-1.5">ĐVT</TableHead>
                        <TableHead className="w-20 px-2 py-1.5 text-right">Số&nbsp;lượng</TableHead>
                        <TableHead className="w-28 px-2 py-1.5 text-right">Đơn&nbsp;giá</TableHead>
                        <TableHead className="w-32 px-2 py-1.5 text-right">
                          Thành&nbsp;tiền
                        </TableHead>
                        {vatInline && (
                          <TableHead className="w-16 px-2 py-1.5 text-right">
                            %&nbsp;Thuế&nbsp;GTGT
                          </TableHead>
                        )}
                        {vatInline && (
                          <TableHead className="w-28 px-2 py-1.5 text-right">
                            Tiền&nbsp;thuế&nbsp;GTGT
                          </TableHead>
                        )}
                        {vatInline && showAccounts && (
                          <TableHead className="w-24 px-2 py-1.5">TK thuế GTGT</TableHead>
                        )}
                        <TableHead className="w-8 px-2 py-1.5" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((f, i) => {
                        const l = lines?.[i]
                        const amount = (l?.quantity || 0) * (l?.unitPrice || 0)
                        const vat = (amount * (l?.vatRate || 0)) / 100
                        return (
                          <TableRow key={f.id}>
                            <TableCell className="px-2 py-1 text-center text-slate-400">
                              {i + 1}
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              <ItemCell
                                value={l?.itemId}
                                placeholder={variant.itemCodeLabel}
                                onPick={(item) => pickItem(i, item)}
                              />
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              <CellInput
                                {...register(`lines.${i}.itemName`)}
                                className={cn(
                                  cellInputCls,
                                  formState.errors.lines?.[i]?.itemName &&
                                    'rounded ring-1 ring-inset ring-red-500',
                                )}
                              />
                            </TableCell>
                            {showWarehouse && (
                              <TableCell className="px-2 py-1">
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
                              </TableCell>
                            )}
                            {showAccounts && (
                              <TableCell className="px-2 py-1">
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
                              </TableCell>
                            )}
                            {showAccounts && (
                              <TableCell className="px-2 py-1">
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
                              </TableCell>
                            )}
                            <TableCell className="px-2 py-1">
                              <CellInput {...register(`lines.${i}.unit`)} />
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              <CellInput
                                type="number"
                                min={0}
                                step="any"
                                {...register(`lines.${i}.quantity`)}
                                className={cn('text-right')}
                              />
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              <Controller
                                control={control}
                                name={`lines.${i}.unitPrice`}
                                render={({ field }) => (
                                  <AmountInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    className={cellInputCls}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell className="px-2 py-1 text-right tabular-nums text-slate-700">
                              {formatCurrency(amount)}
                            </TableCell>
                            {vatInline && (
                              <TableCell className="px-2 py-1">
                                <CellInput
                                  type="number"
                                  min={0}
                                  max={100}
                                  step="any"
                                  {...register(`lines.${i}.vatRate`)}
                                  className={cn('text-right')}
                                />
                              </TableCell>
                            )}
                            {vatInline && (
                              <TableCell className="px-2 py-1 text-right tabular-nums text-slate-700">
                                {formatCurrency(vat)}
                              </TableCell>
                            )}
                            {vatInline && showAccounts && (
                              <TableCell className="px-2 py-1">
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
                              </TableCell>
                            )}
                            <TableCell className="px-2 py-1 text-center">
                              <button
                                type="button"
                                onClick={() => fields.length > 1 && remove(i)}
                                className="text-slate-400 hover:text-red-600"
                                aria-label="Xóa dòng"
                              >
                                <TrashIcon size={14} />
                              </button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                    <TableFooter className="bg-slate-100">
                      <TableRow>
                        <TableCell className="px-2 py-1.5" colSpan={leadCols}>
                          Tổng cộng
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-right tabular-nums">
                          {totalQty}
                        </TableCell>
                        <TableCell />
                        <TableCell className="px-2 py-1.5 text-right tabular-nums">
                          {formatCurrency(totalGoods)}
                        </TableCell>
                        {vatInline && <TableCell />}
                        {vatInline && (
                          <TableCell className="px-2 py-1.5 text-right tabular-nums">
                            {formatCurrency(totalVat)}
                          </TableCell>
                        )}
                        <TableCell colSpan={vatInline && showAccounts ? 2 : 1} />
                      </TableRow>
                    </TableFooter>
                  </Table>
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

          {/* Lỗi cấp mảng (thiếu dòng hàng thật) nằm ở root khi có thêm lỗi từng dòng. */}
          {(() => {
            const msg = formState.errors.lines?.message ?? formState.errors.lines?.root?.message
            return typeof msg === 'string' ? <p className="text-sm text-red-600">{msg}</p> : null
          })()}

          {/* Summary (phải) — thứ tự số như MISA (§5.6). Tra cứu HĐĐT đã bỏ khỏi UI,
                field einvoiceLookup* vẫn giữ trong schema (dữ liệu nhập khẩu Excel). */}
          <div className="flex md:justify-end">
            <div className="grid w-full max-w-sm grid-cols-2 gap-y-1.5 text-sm">
              <span className="text-slate-500">{variant.totalGoodsLabel}</span>
              <span className="text-right tabular-nums">{formatCurrency(totalGoods)}</span>
              <span className="text-slate-500">Thuế GTGT</span>
              <span className="text-right tabular-nums">{formatCurrency(totalVat)}</span>
              <span className="font-semibold text-slate-700">Tổng tiền thanh toán</span>
              <span className="text-right font-semibold tabular-nums text-primary">
                {formatCurrency(totalPayment)}
              </span>
              {/* Chi phí mua hàng đến từ tab Chi phí (Σ phân bổ); nhập kho gọi
                    "Giá trị nhập kho", không qua kho gọi "Tổng giá trị" (MISA). */}
              {variant.totalValueLabel && (
                <>
                  <span className="text-slate-500">Chi phí mua hàng</span>
                  <span className="text-right tabular-nums">
                    {formatCurrency(purchaseCostValue)}
                  </span>
                  <span className="text-slate-500">{variant.totalValueLabel}</span>
                  <span className="text-right tabular-nums">{formatCurrency(stockValue)}</span>
                </>
              )}
            </div>
          </div>
        </section>
      </fieldset>

      {/* ── Action bar (§5.7): nút hành động ── */}
      <div className="flex shrink-0 items-center gap-3 border-t border-border px-4 py-2.5">
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

      <CostVoucherPickerDialog
        open={costDialog}
        onClose={() => setCostDialog(false)}
        pickedIds={(costAllocs ?? []).map((a) => a.costVoucherId)}
        onPick={(o) => {
          // Mặc định phân bổ toàn bộ số còn lại — sửa được ngay trên bảng.
          costArray.append({
            costVoucherId: o.id,
            voucherNo: o.voucherNo,
            postingDate: o.postingDate,
            voucherDate: o.voucherDate,
            supplierName: o.supplierName,
            totalCost: Number(o.totalCost),
            allocatedOther: Number(o.allocatedTotal),
            amount: Number(o.remaining),
          })
          setCostDialog(false)
        }}
      />
    </form>
  )
}

// Ô Mã hàng/Mã dịch vụ: combobox tra cứu VTHH, keyword riêng theo từng dòng.
function ItemCell({
  value,
  placeholder,
  onPick,
}: {
  value?: string
  placeholder: string
  onPick: (item: ItemOption) => void
}) {
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
      placeholder={placeholder}
      inputClassName={cellInputCls}
      allowFreeText
    />
  )
}
