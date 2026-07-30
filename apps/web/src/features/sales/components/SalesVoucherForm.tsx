import {
  CHART_OF_ACCOUNTS,
  InvoicePaymentForm,
  PartnerType,
  PaymentMethod,
  SalesPaymentMode,
  SalesVoucherType,
  type CreateSalesVoucherInput,
} from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { WarehousePicker, warehouseCellCls } from '@/shared/ui/warehouse-picker'
import { useToast } from '@/shared/ui/toast'
import { useCustomers } from '../api/useCustomers'
import { useNextSalesVoucherNo, useSalesVoucher } from '../api/useSalesVouchers'
import { useCreateSalesVoucher, useUpdateSalesVoucher } from '../api/useSalesVoucherMutations'
import {
  salesVoucherSchema,
  type SalesLineFormValues,
  type SalesVoucherFormValues,
} from '../schema'
import {
  INVOICE_PAYMENT_FORM_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_MODE_LABEL,
  VOUCHER_TYPE_LABEL,
} from '../types'
import { AmountInput } from './AmountInput'

interface SalesVoucherFormProps {
  voucherId?: string | null
  // Nhân bản: id chứng từ nguồn — nạp sẵn dữ liệu, lưu thành chứng từ mới.
  duplicateFromId?: string | null
  // Điền sẵn KH khi lập chứng từ từ danh mục khách hàng (nút "Lập CT bán hàng").
  initialCustomer?: { code: string; name: string; address?: string } | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

// Ô text rỗng → undefined (DB giữ NULL, không lưu chuỗi rỗng).
const blank = (s?: string) => (s?.trim() ? s.trim() : undefined)

function emptyLine(
  // Thu tiền mặt ngay → vế Nợ là quỹ 1111 thay công nợ 131 (khớp định khoản backend).
  debtAccount: string = CHART_OF_ACCOUNTS.RECEIVABLE,
): SalesLineFormValues {
  return {
    itemName: '',
    unit: '',
    quantity: 1,
    unitPrice: 0,
    tradeDiscount: 0,
    vatRate: 8,
    debtAccount,
    revenueAccount: CHART_OF_ACCOUNTS.REVENUE_GOODS,
    vatAccount: CHART_OF_ACCOUNTS.VAT_OUTPUT_DETAIL,
    // Tab Giá vốn — TK ngầm định như MISA (632/156), đè lại khi chọn mã hàng.
    costAccount: CHART_OF_ACCOUNTS.COGS,
    inventoryAccount: CHART_OF_ACCOUNTS.INVENTORY,
    costPrice: 0,
  }
}

function defaultValues(): SalesVoucherFormValues {
  return {
    voucherType: SalesVoucherType.DomesticGoods,
    paymentMode: SalesPaymentMode.Unpaid,
    withInvoice: true,
    isInventoryIssue: true,
    isPosInvoice: false,
    postingDate: today(),
    voucherDate: today(),
    customerName: '',
    description: 'Bán hàng',
    // Tab Hóa đơn: ngày HĐ mặc định = hôm nay, hình thức TT ngầm định TM/CK (như MISA).
    invoiceDate: today(),
    invoicePaymentForm: InvoicePaymentForm.CashOrTransfer,
    lines: [emptyLine()],
  }
}

// Thành tiền dòng = SL × Đơn giá − Chiết khấu TM; tiền thuế = thành tiền × %VAT
// (khớp cách backend tính amount/vatAmount).
function lineAmount(l: SalesLineFormValues): number {
  return Math.max(0, (l.quantity || 0) * (l.unitPrice || 0) - (l.tradeDiscount || 0))
}
function lineVat(l: SalesLineFormValues): number {
  return Math.round((lineAmount(l) * (l.vatRate || 0)) / 100)
}
// Tiền vốn dòng = SL × Đơn giá vốn (tab Giá vốn).
function lineCost(l?: SalesLineFormValues): number {
  return (l?.quantity || 0) * (l?.costPrice || 0)
}

// Trang chứng từ bán hàng — bố cục §5 design.md (mirror PurchaseVoucherForm):
// page header (tiêu đề + số CT + loại nghiệp vụ) → sub-header (tùy chọn TT +
// tổng tiền) → tabs bản ghi → form body cuộn → action bar sticky. Form tự dựng
// cả 3 tầng vì header/sub-header đọc-ghi trực tiếp state form.
export function SalesVoucherForm({
  voucherId,
  duplicateFromId,
  initialCustomer,
  readOnly = false,
  onSaved,
  onCancel,
}: SalesVoucherFormProps) {
  // Nạp dữ liệu từ chứng từ đang sửa HOẶC chứng từ nguồn khi nhân bản.
  const duplicating = !voucherId && !!duplicateFromId
  const editing = useSalesVoucher(voucherId ?? duplicateFromId ?? null)
  const create = useCreateSalesVoucher()
  const update = useUpdateSalesVoucher()
  const { toast } = useToast()

  const form = useForm<SalesVoucherFormValues>({
    resolver: zodResolver(salesVoucherSchema),
    defaultValues: {
      ...defaultValues(),
      // Lập CT từ danh mục KH: điền sẵn khách hàng (bị đè khi sửa/nhân bản).
      ...(initialCustomer
        ? {
            customerId: initialCustomer.code,
            customerName: initialCustomer.name,
            address: initialCustomer.address,
          }
        : {}),
    },
  })
  const { control, register, handleSubmit, reset, watch, setValue, getValues, formState } = form
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'lines' })

  // Tab bản ghi (§5.4) + toggle cột tài khoản (§5.7).
  const [tab, setTab] = useState<'main' | 'issue' | 'invoice'>('main')
  // Tab trong khối dòng hàng: Hàng tiền | Giá vốn (giá vốn do backend tính khi lưu).
  const [lineTab, setLineTab] = useState<'goods' | 'cost'>('goods')
  // Cột tài khoản luôn hiện (đã bỏ toggle "Hiển thị tài khoản", như purchase).
  const showAccounts = true
  // Điều khoản thanh toán: nhóm gập như MISA (mở sẵn khi còn nợ).
  const [termsOpen, setTermsOpen] = useState(true)

  // Preview số chứng từ kế tiếp khi tạo mới — số thật vẫn cấp lúc Lưu.
  // Số đổi theo tùy chọn thanh toán (PT/BH) nên truyền cả mode.
  const nextNo = useNextSalesVoucherNo(watch('voucherDate'), watch('paymentMode'), !voucherId)

  // Picker khách hàng: tra cứu theo mã/tên, tự điền tên + MST + địa chỉ.
  const [customerKw, setCustomerKw] = useState('')
  // Chỉ KH đang theo dõi — KH "ngừng sử dụng" không được chọn cho chứng từ mới.
  const customers = useCustomers({
    page: 1,
    pageSize: 20,
    keyword: customerKw.trim() || undefined,
    isActive: true,
  })
  const customerItems = useMemo<PartnerOption[]>(
    () =>
      (customers.data?.data ?? []).map((c) => ({
        code: c.code,
        name: c.name,
        type: PartnerType.Customer,
        taxCode: c.taxCode,
        address: c.address,
        phone: c.phone,
      })),
    [customers.data],
  )
  const [customerDialog, setCustomerDialog] = useState(false)
  const selectCustomer = (p: PartnerOption) => {
    setValue('customerId', p.code)
    setValue('customerName', p.name)
    if (p.taxCode) setValue('taxCode', p.taxCode)
    if (p.address) setValue('address', p.address)
    // Điện thoại + người mua hàng cho tab Hóa đơn.
    if (p.phone) setValue('phone', p.phone)
    setValue('buyerName', p.name)
    // Tự sinh Diễn giải theo khách hàng ("Bán hàng cho X") — như MISA, cùng pattern BankVoucherForm.
    setValue('description', `Bán hàng cho ${p.name}`)
  }

  // Picker nhân viên bán hàng (+ tạo nhanh) — cùng pattern chứng từ thu/chi.
  const [employeeKw, setEmployeeKw] = useState('')
  const { items: employeeItems, loading: employeeLoading } = useEmployeeOptions(employeeKw)
  const [employeeDialog, setEmployeeDialog] = useState(false)

  // Chọn VTHH ở ô Mã hàng → điền dòng hàng theo dữ liệu ngầm định của danh mục
  // (tên, ĐVT, đơn giá bán 1, % thuế GTGT) — như MISA. Gõ mã ngoài danh mục vẫn
  // được: chỉ có `code`, các trường khác giữ nguyên.
  const pickItem = (i: number, item: ItemOption) => {
    setValue(`lines.${i}.itemId`, item.code)
    if (item.name) setValue(`lines.${i}.itemName`, item.name)
    if (item.unit) setValue(`lines.${i}.unit`, item.unit)
    const price = Number(item.salePrice)
    // Chỉ gợi ý đơn giá khi dòng còn trống — không đè giá người dùng đã nhập.
    if (Number.isFinite(price) && price > 0 && !getValues(`lines.${i}.unitPrice`))
      setValue(`lines.${i}.unitPrice`, price)
    // vatRate trong danh mục là text MISA ("10" / "8" / "KCT" / …) — chỉ nhận số.
    const vat = Number(item.vatRate)
    if (item.vatRate && Number.isFinite(vat)) setValue(`lines.${i}.vatRate`, vat)
    // Tab Giá vốn: kho ngầm định + TK giá vốn/TK kho + đơn giá vốn (đơn giá mua gần nhất).
    if (item.defaultWarehouseCode) setValue(`lines.${i}.warehouseId`, item.defaultWarehouseCode)
    if (item.costAccount) setValue(`lines.${i}.costAccount`, item.costAccount)
    if (item.inventoryAccount) setValue(`lines.${i}.inventoryAccount`, item.inventoryAccount)
    const cost = Number(item.purchasePrice)
    // Chỉ gợi ý khi dòng chưa có giá vốn — không đè giá người dùng đã nhập.
    if (Number.isFinite(cost) && cost > 0 && !getValues(`lines.${i}.costPrice`))
      setValue(`lines.${i}.costPrice`, cost)
  }

  // Nạp dữ liệu khi sửa.
  useEffect(() => {
    const v = editing.data
    if (!v) return
    reset({
      voucherType: v.voucherType,
      paymentMode: v.paymentMode,
      withInvoice: v.withInvoice,
      isInventoryIssue: v.isInventoryIssue,
      isPosInvoice: v.isPosInvoice,
      // Nhân bản → không mang theo số hóa đơn (hóa đơn gắn với chứng từ gốc).
      invoiceNo: duplicating ? undefined : (v.invoiceNo ?? undefined),
      // Nhân bản → ngày về hôm nay (chứng từ mới), sửa → giữ nguyên ngày gốc.
      postingDate: duplicating ? today() : v.postingDate.slice(0, 10),
      voucherDate: duplicating ? today() : v.voucherDate.slice(0, 10),
      customerId: v.customerId ?? undefined,
      customerName: v.customerName ?? '',
      taxCode: v.taxCode ?? undefined,
      contactPerson: v.contactPerson ?? undefined,
      address: v.address ?? undefined,
      salesEmployeeId: v.salesEmployeeId ?? undefined,
      description: v.description ?? undefined,
      paymentTermId: v.paymentTermId ?? undefined,
      creditDays: v.creditDays ?? undefined,
      dueDate: v.dueDate ? v.dueDate.slice(0, 10) : undefined,
      issueReason: v.issueReason ?? undefined,
      // Tab Hóa đơn — nhân bản: hóa đơn thuộc chứng từ gốc nên bỏ mẫu số/ký hiệu, ngày HĐ về hôm nay.
      invoiceForm: duplicating ? undefined : (v.invoiceForm ?? undefined),
      invoiceSerial: duplicating ? undefined : (v.invoiceSerial ?? undefined),
      invoiceDate: duplicating ? today() : (v.invoiceDate?.slice(0, 10) ?? undefined),
      buyerName: v.buyerName ?? undefined,
      invoicePaymentForm: v.invoicePaymentForm ?? InvoicePaymentForm.CashOrTransfer,
      bankAccountNo: v.bankAccountNo ?? undefined,
      phone: v.phone ?? undefined,
      budgetRelationCode: v.budgetRelationCode ?? undefined,
      idCardNo: v.idCardNo ?? undefined,
      passportNo: v.passportNo ?? undefined,
      lines: v.lines.map((l) => ({
        itemId: l.itemId ?? undefined,
        itemName: l.itemName ?? undefined,
        unit: l.unit ?? undefined,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        tradeDiscount: Number(l.tradeDiscount),
        vatRate: Number(l.vatRate),
        lotNo: l.lotNo ?? undefined,
        debtAccount: l.debtAccount ?? undefined,
        revenueAccount: l.revenueAccount ?? undefined,
        vatAccount: l.vatAccount ?? undefined,
        warehouseId: l.warehouseId ?? undefined,
        costAccount: l.costAccount ?? undefined,
        inventoryAccount: l.inventoryAccount ?? undefined,
        costPrice: Number(l.costPrice),
      })),
    })
  }, [editing.data, reset, duplicating])

  const withInvoice = watch('withInvoice')
  const isInventoryIssue = watch('isInventoryIssue')
  const paymentMode = watch('paymentMode')
  const lines = watch('lines')
  const totalQty = lines?.reduce((s, l) => s + (l.quantity || 0), 0) ?? 0
  const totalDiscount = lines?.reduce((s, l) => s + (l.tradeDiscount || 0), 0) ?? 0
  const totalGoods = lines?.reduce((s, l) => s + lineAmount(l), 0) ?? 0
  const totalVat = lines?.reduce((s, l) => s + lineVat(l), 0) ?? 0
  const totalPayment = totalGoods + totalVat
  const totalCost = (lines ?? []).reduce((s, l) => s + lineCost(l), 0)

  // Thu tiền mặt ngay → TK công nợ dòng hàng đổi 131 → 1111 và ngược lại (MISA
  // đổi tự động); chỉ đè giá trị mặc định, giữ TK người dùng đã sửa tay.
  const paysCash = paymentMode === SalesPaymentMode.PaidNow
  const lineDebtDefault = paysCash ? CHART_OF_ACCOUNTS.CASH_ON_HAND : CHART_OF_ACCOUNTS.RECEIVABLE
  useEffect(() => {
    const defaults: string[] = [CHART_OF_ACCOUNTS.RECEIVABLE, CHART_OF_ACCOUNTS.CASH_ON_HAND]
    getValues('lines')?.forEach((l, i) => {
      if (l.debtAccount !== lineDebtDefault && defaults.includes(l.debtAccount ?? ''))
        setValue(`lines.${i}.debtAccount`, lineDebtDefault)
    })
  }, [lineDebtDefault, getValues, setValue])
  const isUnpaid = paymentMode === SalesPaymentMode.Unpaid

  // Bỏ tick "Kiêm phiếu xuất" khi đang ở tab Phiếu xuất → về tab chứng từ.
  useEffect(() => {
    if (!isInventoryIssue && tab === 'issue') setTab('main')
  }, [isInventoryIssue, tab])

  const submit = (goNext: boolean) =>
    handleSubmit(async (values) => {
      const dto: CreateSalesVoucherInput = {
        ...values,
        // Input date bỏ trống trả chuỗi rỗng — backend @IsDateString từ chối "".
        dueDate: values.dueDate || undefined,
        invoiceDate: values.invoiceDate || undefined,
        // Ô text bỏ trống: gửi undefined để DB giữ NULL thay vì chuỗi rỗng.
        issueReason: blank(values.issueReason),
        invoiceForm: blank(values.invoiceForm),
        invoiceSerial: blank(values.invoiceSerial),
        buyerName: blank(values.buyerName),
        bankAccountNo: blank(values.bankAccountNo),
        phone: blank(values.phone),
        budgetRelationCode: blank(values.budgetRelationCode),
        idCardNo: blank(values.idCardNo),
        passportNo: blank(values.passportNo),
        invoiceNo: blank(values.invoiceNo),
        lines: values.lines.map((l) => ({
          itemId: l.itemId,
          itemName: l.itemName,
          unit: l.unit,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          tradeDiscount: l.tradeDiscount,
          vatRate: l.vatRate,
          lotNo: l.lotNo,
          debtAccount: l.debtAccount,
          revenueAccount: l.revenueAccount,
          vatAccount: l.vatAccount,
          warehouseId: l.warehouseId,
          costAccount: l.costAccount,
          inventoryAccount: l.inventoryAccount,
          costPrice: l.costPrice,
        })),
      }
      try {
        if (voucherId) {
          // Sửa phiếu không cho đổi loại (voucherType) — backend từ chối field thừa (forbidNonWhitelisted).
          const { voucherType: _voucherType, ...updateDto } = dto
          await update.mutateAsync({ id: voucherId, dto: updateDto })
        } else await create.mutateAsync(dto)
        if (goNext && !voucherId) {
          // Giữ nguyên tùy chọn thanh toán đang chọn khi lưu và thêm tiếp.
          reset({ ...defaultValues(), paymentMode: values.paymentMode })
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
  // Lý do xuất tự sinh (placeholder tab Phiếu xuất) — khớp diễn giải backend dùng khi
  // người dùng để trống ô "Lý do xuất".
  const issueCustomer = watch('customerName')
  const autoIssueReason = `Xuất kho bán hàng${issueCustomer ? ` ${issueCustomer}` : ''}${
    displayNo ? ` theo chứng từ ${displayNo}` : ''
  }`

  return (
    <form className="flex h-screen flex-col bg-white">
      {/* ── Page header (§5.2): tiêu đề + số CT · loại nghiệp vụ · ✕ — nền primary nhạt (2 lớp màu, đồng bộ cash) ── */}
      <header className="flex h-14 shrink-0 items-center gap-3 bg-primary/5 px-4">
        <h1 className="shrink-0 whitespace-nowrap text-lg font-bold text-slate-800">
          Chứng từ bán hàng <span className="text-primary">{displayNo}</span>
        </h1>
        <Select
          value={watch('voucherType')}
          disabled={readOnly || !!voucherId}
          onValueChange={(v) => setValue('voucherType', v as SalesVoucherType)}
        >
          <SelectTrigger className="h-9 w-72 shrink-0 bg-white" title="Loại nghiệp vụ">
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
        {/* Lập chứng từ từ phiếu xuất đã có — chưa hỗ trợ, giữ chỗ đúng vị trí MISA. */}
        <input
          disabled
          placeholder="Nhập số phiếu xuất"
          title="Lập chứng từ từ phiếu xuất — chưa hỗ trợ"
          className={cn(inputCls, 'w-52 shrink-0 disabled:bg-white disabled:text-slate-400')}
        />
        {/* Badge trạng thái hóa đơn (chỉ có nghĩa khi chứng từ đã lưu). */}
        {!!voucherId && !!editing.data?.invoiceNo && (
          <span className="shrink-0 rounded-md border border-emerald-500 px-2 py-1 text-xs font-bold uppercase text-emerald-600">
            Đã lập hóa đơn
          </span>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Đóng"
        >
          <XIcon size={18} />
        </button>
      </header>

      {/* ── Sub-header (§5.3): tùy chọn thanh toán · kiêm phiếu xuất/hóa đơn | tổng tiền ── */}
      <div className="flex shrink-0 flex-wrap items-center gap-4 bg-primary/5 px-4 py-2">
        <fieldset disabled={readOnly} className="flex flex-wrap items-center gap-4">
          {[SalesPaymentMode.Unpaid, SalesPaymentMode.PaidNow].map((m) => (
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
          {/* Hình thức thanh toán: bán hàng chỉ hỗ trợ tiền mặt (phiếu thu tự sinh). */}
          <Select value={PaymentMethod.Cash} disabled>
            <SelectTrigger className="h-9 w-36 bg-white" title="Thu tiền ngay chỉ hỗ trợ tiền mặt">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PaymentMethod.Cash}>
                {PAYMENT_METHOD_LABEL[PaymentMethod.Cash]}
              </SelectItem>
            </SelectContent>
          </Select>
          <span className="h-4 w-px bg-border" />
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" {...register('isInventoryIssue')} /> Kiêm phiếu xuất
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" {...register('withInvoice')} /> Lập kèm hóa đơn
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" {...register('isPosInvoice')} /> Hóa đơn từ máy tính tiền
          </label>
        </fieldset>
        <div className="ml-auto text-right">
          <div className="text-xs text-slate-500">Tổng tiền thanh toán</div>
          <div className="text-2xl font-bold tabular-nums text-primary">
            {formatCurrency(totalPayment)}
          </div>
        </div>
      </div>

      {/* ── Tabs bản ghi (§5.4) — vẫn thuộc lớp tint ── */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-primary/5 px-4">
        {(
          [
            { key: 'main', label: isUnpaid ? 'Chứng từ ghi nợ' : 'Chứng từ bán hàng' },
            // Tab phiếu xuất chỉ có nghĩa khi chứng từ kiêm phiếu xuất kho.
            ...(isInventoryIssue ? ([{ key: 'issue', label: 'Phiếu xuất' }] as const) : []),
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

      {/* ── Form body (§5.5) — cuộn dọc, 2 lớp màu: thông tin chung tint / bảng hàng trắng ── */}
      <fieldset disabled={readOnly} className="flex-1 overflow-y-auto disabled:opacity-90">
        <section className="space-y-4 bg-primary/5 px-4 pb-4 pt-3">
          {tab === 'invoice' ? (
            // Tab Hóa đơn — thông tin hóa đơn lập kèm (§3, layout MISA). Mẫu số HĐ và
            // Ký hiệu HĐ do hệ thống HĐĐT cấp khi phát hành → chỉ đọc.
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-12">
                {/* Hàng 1 — KH bind cùng field tab chứng từ nên sửa ở đâu cũng đồng bộ. */}
                <Field label="Mã khách hàng" className="md:col-span-3">
                  <PartnerPicker
                    value={watch('customerId')}
                    items={customerItems}
                    loading={customers.isLoading}
                    keyword={customerKw}
                    onKeywordChange={setCustomerKw}
                    placeholder="Mã KH"
                    onSelect={selectCustomer}
                    onAddNew={() => setCustomerDialog(true)}
                  />
                </Field>
                <Field label="Tên khách hàng" className="md:col-span-4">
                  <input {...register('customerName')} className={inputCls} />
                </Field>
                <div className="hidden md:col-span-2 md:block" />
                <Field label="Mẫu số HĐ" className="md:col-span-3">
                  <input {...register('invoiceForm')} placeholder="VD: 1" className={inputCls} />
                </Field>

                {/* Hàng 2 */}
                <Field label="Mã số thuế / CCCD chủ hộ" className="md:col-span-3">
                  <input {...register('taxCode')} className={inputCls} />
                </Field>
                <Field label="Mã số ĐVQHNS" className="md:col-span-2">
                  <input {...register('budgetRelationCode')} className={inputCls} />
                </Field>
                <Field label="Số CCCD" className="md:col-span-2">
                  <input {...register('idCardNo')} className={inputCls} />
                </Field>
                <Field label="Số hộ chiếu" className="md:col-span-2">
                  <input {...register('passportNo')} className={inputCls} />
                </Field>
                <Field label="Ký hiệu HĐ" className="md:col-span-3">
                  <input
                    {...register('invoiceSerial')}
                    placeholder="VD: C26TAA"
                    className={inputCls}
                  />
                </Field>

                {/* Hàng 3 */}
                <Field label="Địa chỉ" className="md:col-span-7">
                  <input {...register('address')} className={inputCls} />
                </Field>
                <Field label="Điện thoại" className="md:col-span-2">
                  <input {...register('phone')} className={inputCls} />
                </Field>
                <Field label="Số hóa đơn" className="md:col-span-3">
                  <input {...register('invoiceNo')} className={inputCls} />
                </Field>

                {/* Hàng 4 — người mua bỏ trống = lấy tên KH khi in hóa đơn. */}
                <Field label="Người mua hàng" className="md:col-span-3">
                  <input
                    {...register('buyerName')}
                    placeholder={watch('customerName') || undefined}
                    className={inputCls}
                  />
                </Field>
                <Field label="Hình thức thanh toán" className="md:col-span-3">
                  <Controller
                    control={control}
                    name="invoicePaymentForm"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? InvoicePaymentForm.CashOrTransfer}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(InvoicePaymentForm).map((f) => (
                            <SelectItem key={f} value={f}>
                              {INVOICE_PAYMENT_FORM_LABEL[f]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field label="Tài khoản ngân hàng" className="md:col-span-3">
                  <input {...register('bankAccountNo')} className={inputCls} />
                </Field>
                <Field label="Ngày HĐ" className="md:col-span-3">
                  <input type="date" {...register('invoiceDate')} className={inputCls} />
                </Field>
              </div>

              {/* Tham chiếu — mã/đường dẫn tra cứu HĐĐT khi đã phát hành. */}
              <p className="space-x-3 text-sm text-slate-600">
                <span>Tham chiếu:</span>
                {editing.data?.einvoiceLookupUrl ? (
                  <a
                    href={editing.data.einvoiceLookupUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    Tra cứu HĐĐT {editing.data.einvoiceLookupCode ?? ''}
                  </a>
                ) : (
                  <span className="text-slate-400">…</span>
                )}
              </p>

              {!withInvoice && (
                <p className="text-xs text-slate-500">
                  Bật “Lập kèm hóa đơn” ở dải trên nếu chứng từ có hóa đơn.
                </p>
              )}
            </div>
          ) : tab === 'issue' ? (
            // Tab Phiếu xuất — sửa được, mọi ô bind cùng field với tab chứng từ nên tự
            // đồng bộ 2 chiều. Phiếu xuất kho tự sinh khi Cất dùng đúng các giá trị này.
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-12">
                {/* Hàng 1 */}
                <Field label="Mã khách hàng" className="md:col-span-3">
                  <PartnerPicker
                    value={watch('customerId')}
                    items={customerItems}
                    loading={customers.isLoading}
                    keyword={customerKw}
                    onKeywordChange={setCustomerKw}
                    placeholder="Mã KH"
                    onSelect={selectCustomer}
                    onAddNew={() => setCustomerDialog(true)}
                  />
                </Field>
                <Field label="Tên khách hàng" className="md:col-span-4">
                  <input {...register('customerName')} className={inputCls} />
                </Field>
                <div className="hidden md:col-span-2 md:block" />
                <Field label="Ngày hạch toán" className="md:col-span-3">
                  <input type="date" {...register('postingDate')} className={inputCls} />
                </Field>

                {/* Hàng 2 — người nhận = Người liên hệ; trống thì phiếu xuất lấy tên KH. */}
                <Field label="Người nhận" className="md:col-span-3">
                  <input
                    {...register('contactPerson')}
                    placeholder={watch('customerName') || undefined}
                    className={inputCls}
                  />
                </Field>
                <Field label="Địa chỉ" className="md:col-span-4">
                  <input {...register('address')} className={inputCls} />
                </Field>
                <div className="hidden md:col-span-2 md:block" />
                <Field label="Ngày chứng từ" className="md:col-span-3">
                  <input type="date" {...register('voucherDate')} className={inputCls} />
                </Field>

                {/* Hàng 3 */}
                <Field label="Nhân viên bán hàng" className="md:col-span-3">
                  <PartnerPicker
                    value={watch('salesEmployeeId')}
                    items={employeeItems}
                    loading={employeeLoading}
                    keyword={employeeKw}
                    onKeywordChange={setEmployeeKw}
                    placeholder="Mã nhân viên"
                    onSelect={(p) => setValue('salesEmployeeId', p.code)}
                    onAddNew={() => setEmployeeDialog(true)}
                  />
                </Field>
                <Field label="Lý do xuất" className="md:col-span-4">
                  <input
                    {...register('issueReason')}
                    placeholder={autoIssueReason}
                    className={inputCls}
                  />
                </Field>
                <div className="hidden md:col-span-2 md:block" />
                <Field label="Số phiếu xuất" className="md:col-span-3">
                  <input
                    value={editing.data?.issueNo ?? 'Tự động khi Cất'}
                    readOnly
                    title="Số phiếu xuất do hệ thống cấp khi Cất"
                    className={roInputCls}
                  />
                </Field>
              </div>

              {/* Tham chiếu — link phiếu xuất đã sinh (chỉ có sau khi Cất). */}
              <p className="space-x-3 text-sm text-slate-600">
                <span>Tham chiếu:</span>
                {editing.data?.issueId ? (
                  <Link
                    to={`/inventory/issues/${editing.data.issueId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {editing.data.issueNo ?? 'Phiếu xuất'}
                  </Link>
                ) : (
                  <span className="text-slate-400">…</span>
                )}
              </p>
            </div>
          ) : (
            <>
              {/* Lưới trường 4 cụm như MISA: mã KH | tên KH/địa chỉ/diễn giải | MST | ngày + số CT (§5.5) */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-12">
                {/* Hàng 1 */}
                <Field label="Mã khách hàng" className="md:col-span-3">
                  <PartnerPicker
                    value={watch('customerId')}
                    items={customerItems}
                    loading={customers.isLoading}
                    keyword={customerKw}
                    onKeywordChange={setCustomerKw}
                    placeholder="Mã KH"
                    onSelect={selectCustomer}
                    onAddNew={() => setCustomerDialog(true)}
                  />
                </Field>
                <Field
                  label="Tên khách hàng"
                  error={formState.errors.customerName?.message}
                  className="md:col-span-4"
                >
                  <input {...register('customerName')} className={inputCls} />
                </Field>
                <Field label="Mã số thuế / CCCD chủ hộ" className="md:col-span-2">
                  <input {...register('taxCode')} className={inputCls} />
                </Field>
                <Field
                  label="Ngày hạch toán"
                  error={formState.errors.postingDate?.message}
                  className="md:col-span-3"
                >
                  <input type="date" {...register('postingDate')} className={inputCls} />
                </Field>

                {/* Hàng 2 */}
                <Field label="Người liên hệ" className="md:col-span-3">
                  <input {...register('contactPerson')} className={inputCls} />
                </Field>
                <Field label="Địa chỉ" className="md:col-span-4">
                  <input {...register('address')} className={inputCls} />
                </Field>
                <div className="hidden md:col-span-2 md:block" />
                <Field
                  label="Ngày chứng từ"
                  error={formState.errors.voucherDate?.message}
                  className="md:col-span-3"
                >
                  <input type="date" {...register('voucherDate')} className={inputCls} />
                </Field>

                {/* Hàng 3 */}
                <Field label="Nhân viên bán hàng" className="md:col-span-3">
                  <PartnerPicker
                    value={watch('salesEmployeeId')}
                    items={employeeItems}
                    loading={employeeLoading}
                    keyword={employeeKw}
                    onKeywordChange={setEmployeeKw}
                    placeholder="Mã nhân viên"
                    onSelect={(p) => setValue('salesEmployeeId', p.code)}
                    onAddNew={() => setEmployeeDialog(true)}
                  />
                </Field>
                <Field label="Diễn giải" className="md:col-span-4">
                  <input {...register('description')} className={inputCls} />
                </Field>
                <div className="hidden md:col-span-2 md:block" />
                <Field label="Số chứng từ" className="md:col-span-3">
                  <input
                    value={displayNo || 'Tự động'}
                    readOnly
                    title="Số dự kiến — cấp chính thức khi Cất"
                    className={cn(inputCls, 'bg-slate-50 text-slate-500')}
                  />
                </Field>
              </div>

              {/* Tham chiếu (§5.5) — chứng từ tự sinh: phiếu thu (thu tiền ngay) / phiếu xuất kho. */}
              <p className="space-x-3 text-sm text-slate-600">
                <span>Tham chiếu:</span>
                {editing.data?.receiptId && (
                  <Link
                    to={`/cash/vouchers/${editing.data.receiptId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {editing.data.receiptNo ?? 'Phiếu thu'}
                  </Link>
                )}
                {editing.data?.issueId && (
                  <Link
                    to={`/inventory/issues/${editing.data.issueId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {editing.data.issueNo ?? 'Phiếu xuất'}
                  </Link>
                )}
                {!editing.data?.receiptId && !editing.data?.issueId && (
                  <span className="text-slate-400">…</span>
                )}
              </p>

              {/* Điều khoản thanh toán chỉ có nghĩa khi còn nợ (chưa thu tiền) — nhóm gập như MISA */}
              {isUnpaid && (
                <div className="rounded-md bg-slate-50 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setTermsOpen((o) => !o)}
                    className="flex items-center gap-1 text-sm font-medium text-primary"
                  >
                    <span className={cn('transition-transform', termsOpen && 'rotate-90')}>▸</span>
                    Điều khoản thanh toán
                  </button>
                  {termsOpen && (
                    <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
                      <Field label="Điều khoản thanh toán">
                        <input {...register('paymentTermId')} className={inputCls} />
                      </Field>
                      <Field label="Số ngày được nợ">
                        <input
                          type="number"
                          min={0}
                          {...register('creditDays')}
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Hạn thanh toán">
                        <input type="date" {...register('dueDate')} className={inputCls} />
                      </Field>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Lớp nền trắng: bảng dòng hàng + tổng hợp (chỉ tab chứng từ) ── */}
        {/* Bảng dòng hàng dùng chung cho cả 3 tab bản ghi (như MISA): đổi tab chỉ đổi
            khối thông tin chung ở trên, bảng + tổng tiền luôn hiển thị. */}
        <section className="space-y-4 px-4 py-3">
          {/* ── Line section (§5.6): toolbar + bảng dòng hàng ── */}
          <div className="rounded-md border border-border">
            <div className="flex items-center gap-1 border-b border-border bg-slate-50 px-2">
              {(
                [
                  { key: 'goods', label: 'Hàng tiền' },
                  { key: 'cost', label: 'Giá vốn' },
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
              {/* Chiết khấu tổng chưa hỗ trợ — giữ chỗ đúng vị trí toolbar của MISA. */}
              <div className="ml-auto flex items-center gap-2 py-1">
                <span className="text-xs text-slate-500">Chiết khấu</span>
                <Select value="NONE" disabled>
                  <SelectTrigger className="h-8 w-44 bg-white" title="Chiết khấu tổng chưa hỗ trợ">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Không chiết khấu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {lineTab === 'cost' ? (
              // Tab Giá vốn (§5.6) — cột như MISA: Kho · TK giá vốn · TK kho · Đơn giá vốn ·
              // Tiền vốn. Nhập tay được (cùng style ô bảng Hàng tiền); chọn mã hàng ở tab
              // Hàng tiền điền sẵn theo dữ liệu ngầm định VTHH. Phiếu xuất kho tự sinh dùng
              // đúng giá trị ở đây; ô để trống → fallback dữ liệu VTHH.
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] border-collapse text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="w-8 px-2 py-1.5 text-center">#</th>
                        <th className="px-2 py-1.5">Mã hàng</th>
                        <th className="px-2 py-1.5">Tên hàng</th>
                        <th className="w-28 px-2 py-1.5">Kho</th>
                        <th className="w-24 px-2 py-1.5">TK giá vốn</th>
                        <th className="w-24 px-2 py-1.5">TK kho</th>
                        <th className="w-16 px-2 py-1.5">ĐVT</th>
                        <th className="w-24 px-2 py-1.5 text-right">Số&nbsp;lượng</th>
                        <th className="w-32 px-2 py-1.5 text-right">Đơn&nbsp;giá&nbsp;vốn</th>
                        <th className="w-32 px-2 py-1.5 text-right">Tiền&nbsp;vốn</th>
                        <th className="w-8 px-2 py-1.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((f, i) => (
                        <tr key={f.id} className="border-t border-border">
                          <td className="px-2 py-1 text-center text-slate-400">{i + 1}</td>
                          <td className="px-2 py-1">
                            <ItemCell
                              value={lines?.[i]?.itemId}
                              onPick={(item) => pickItem(i, item)}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input {...register(`lines.${i}.itemName`)} className={cellCls} />
                          </td>
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
                          <td className="px-2 py-1">
                            <Controller
                              control={control}
                              name={`lines.${i}.costAccount`}
                              render={({ field }) => (
                                <AccountPicker
                                  value={field.value}
                                  onChange={field.onChange}
                                  inputClassName={accountCellCls}
                                />
                              )}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Controller
                              control={control}
                              name={`lines.${i}.inventoryAccount`}
                              render={({ field }) => (
                                <AccountPicker
                                  value={field.value}
                                  onChange={field.onChange}
                                  inputClassName={accountCellCls}
                                />
                              )}
                            />
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
                              name={`lines.${i}.costPrice`}
                              render={({ field }) => (
                                <AmountInput value={field.value ?? 0} onChange={field.onChange} />
                              )}
                            />
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums text-slate-700">
                            {formatCurrency(lineCost(lines?.[i]))}
                          </td>
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
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-medium">
                      <tr className="border-t border-border">
                        <td className="px-2 py-1.5" colSpan={7}>
                          Tổng cộng
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{totalQty}</td>
                        <td />
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {formatCurrency(totalCost)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="px-2 pb-1 text-xs text-slate-500">
                  Để trống Kho / TK giá vốn / TK kho / Đơn giá vốn thì phiếu xuất kho tự sinh lấy
                  theo dữ liệu ngầm định của vật tư hàng hóa.
                </p>
              </>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] border-collapse text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="w-8 px-2 py-1.5 text-center">#</th>
                        <th className="px-2 py-1.5">Mã hàng</th>
                        <th className="px-2 py-1.5">Tên hàng</th>
                        <th className="w-28 px-2 py-1.5 text-right">CK&nbsp;thương&nbsp;mại</th>
                        {showAccounts && <th className="w-24 px-2 py-1.5">TK công nợ</th>}
                        {showAccounts && <th className="w-24 px-2 py-1.5">TK doanh thu</th>}
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
                      {fields.map((f, i) => (
                        <tr key={f.id} className="border-t border-border">
                          <td className="px-2 py-1 text-center text-slate-400">{i + 1}</td>
                          <td className="px-2 py-1">
                            <ItemCell
                              value={lines?.[i]?.itemId}
                              onPick={(item) => pickItem(i, item)}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              {...register(`lines.${i}.itemName`)}
                              className={cn(
                                cellCls,
                                formState.errors.lines?.[i]?.itemName &&
                                  'rounded ring-1 ring-inset ring-red-500',
                              )}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Controller
                              control={control}
                              name={`lines.${i}.tradeDiscount`}
                              render={({ field }) => (
                                <AmountInput value={field.value ?? 0} onChange={field.onChange} />
                              )}
                            />
                          </td>
                          {showAccounts && (
                            <td className="px-2 py-1">
                              <Controller
                                control={control}
                                name={`lines.${i}.debtAccount`}
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
                                name={`lines.${i}.revenueAccount`}
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
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-medium">
                      <tr className="border-t border-border">
                        {/* #, Mã hàng, Tên hàng */}
                        <td className="px-2 py-1.5" colSpan={3}>
                          Tổng cộng
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {formatCurrency(totalDiscount)}
                        </td>
                        {/* [TK công nợ, TK doanh thu], ĐVT */}
                        <td colSpan={showAccounts ? 3 : 1} />
                        <td className="px-2 py-1.5 text-right tabular-nums">{totalQty}</td>
                        {/* Đơn giá */}
                        <td />
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {formatCurrency(totalGoods)}
                        </td>
                        {/* % thuế GTGT */}
                        <td />
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {formatCurrency(totalVat)}
                        </td>
                        {/* [TK thuế GTGT], cột xóa dòng */}
                        <td colSpan={showAccounts ? 2 : 1} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}

            {/* Nút dòng (§5.6) — dùng chung cho cả 2 sub-tab (Hàng tiền / Giá vốn) */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border px-2 py-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append(emptyLine(lineDebtDefault))}
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
                    ...emptyLine(lineDebtDefault),
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
                onClick={() => replace([emptyLine(lineDebtDefault)])}
              >
                Xóa hết dòng
              </Button>
              <span className="ml-auto text-xs text-slate-500">
                Tổng số: {fields.length} bản ghi
              </span>
            </div>
          </div>

          {/* Lỗi cấp mảng (thiếu dòng hàng thật) nằm ở root khi có thêm lỗi từng dòng. */}
          {(() => {
            const msg = formState.errors.lines?.message ?? formState.errors.lines?.root?.message
            return typeof msg === 'string' ? <p className="text-sm text-red-600">{msg}</p> : null
          })()}

          {/* Summary (phải) — thứ tự số như MISA (§5.6) */}
          <div className="ml-auto grid w-full max-w-sm grid-cols-2 gap-y-1.5 text-sm">
            <span className="text-slate-500">Tổng tiền hàng</span>
            <span className="text-right tabular-nums">{formatCurrency(totalGoods)}</span>
            <span className="text-slate-500">Thuế GTGT</span>
            <span className="text-right tabular-nums">{formatCurrency(totalVat)}</span>
            <span className="font-semibold text-slate-700">Tổng tiền thanh toán</span>
            <span className="text-right font-semibold tabular-nums text-primary">
              {formatCurrency(totalPayment)}
            </span>
          </div>
        </section>
      </fieldset>

      {/* ── Action bar (§5.7): nút hành động ── */}
      <div className="flex shrink-0 items-center gap-3 border-t border-border px-4 py-2.5">
        <div className="ml-auto flex gap-2">
          {readOnly ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Đóng
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                Hủy
              </Button>
              {!voucherId && (
                <Button type="button" variant="secondary" onClick={submit(true)} disabled={saving}>
                  Cất và Thêm
                </Button>
              )}
              <Button type="button" onClick={submit(false)} disabled={saving}>
                {saving ? 'Đang cất…' : 'Cất'}
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
          setValue('salesEmployeeId', p.code)
        }}
      />

      <QuickAddPartnerDialog
        open={customerDialog}
        onClose={() => setCustomerDialog(false)}
        kind="customer"
        initialCode={customerKw.trim() || undefined}
        onCreated={(p) => {
          setCustomerKw('')
          selectCustomer(p)
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
  'h-9 w-full rounded-md border border-border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
// Ô read-only (tab Phiếu xuất — dữ liệu suy ra từ chứng từ bán hàng).
const roInputCls =
  'h-9 w-full rounded-md border border-border bg-slate-50 px-2 text-sm text-slate-500'
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
