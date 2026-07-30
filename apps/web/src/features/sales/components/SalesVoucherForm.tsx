import {
  CHART_OF_ACCOUNTS,
  PartnerType,
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
import { useToast } from '@/shared/ui/toast'
import { useCustomers } from '../api/useCustomers'
import { useNextSalesVoucherNo, useSalesVoucher } from '../api/useSalesVouchers'
import { useCreateSalesVoucher, useUpdateSalesVoucher } from '../api/useSalesVoucherMutations'
import {
  salesVoucherSchema,
  type SalesLineFormValues,
  type SalesVoucherFormValues,
} from '../schema'
import { PAYMENT_MODE_LABEL, VOUCHER_TYPE_LABEL } from '../types'
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
  const [tab, setTab] = useState<'main' | 'invoice'>('main')
  const [showAccounts, setShowAccounts] = useState(true)

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
      })),
    })
  }, [editing.data, reset, duplicating])

  const withInvoice = watch('withInvoice')
  const paymentMode = watch('paymentMode')
  const lines = watch('lines')
  const totalQty = lines?.reduce((s, l) => s + (l.quantity || 0), 0) ?? 0
  const totalDiscount = lines?.reduce((s, l) => s + (l.tradeDiscount || 0), 0) ?? 0
  const totalGoods = lines?.reduce((s, l) => s + lineAmount(l), 0) ?? 0
  const totalVat = lines?.reduce((s, l) => s + lineVat(l), 0) ?? 0
  const totalPayment = totalGoods + totalVat

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

  // Số cột trước "Số lượng" (dòng Tổng cộng) — đổi theo cột TK đang hiện.
  const leadCols = 3 + (showAccounts ? 2 : 0) + 1 // #, mã, tên, [TK CN, TK DT], ĐVT

  const submit = (goNext: boolean) =>
    handleSubmit(async (values) => {
      const dto: CreateSalesVoucherInput = {
        ...values,
        // Input date bỏ trống trả chuỗi rỗng — backend @IsDateString từ chối "".
        dueDate: values.dueDate || undefined,
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
        {/* Chứng từ tự sinh: Phiếu thu (thu tiền mặt ngay) / Phiếu xuất kho. */}
        {!!voucherId && !!(editing.data?.receiptId || editing.data?.issueId) && (
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
          </p>
        )}

        {tab === 'invoice' ? (
          // Tab Hóa đơn — thông tin hóa đơn lập kèm chứng từ bán hàng.
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
            <Field label="Số hóa đơn">
              <input {...register('invoiceNo')} className={inputCls} />
            </Field>
            {!withInvoice && (
              <p className="self-end pb-2 text-xs text-slate-500 md:col-span-2">
                Bật “Lập kèm hóa đơn” ở dải trên nếu chứng từ có hóa đơn.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Lưới trường 3 cụm: KH | liên hệ/địa chỉ/diễn giải | ngày + số CT (§5.5) */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
              <Field label="Mã khách hàng">
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
              <Field label="Tên khách hàng" error={formState.errors.customerName?.message}>
                <input {...register('customerName')} className={inputCls} />
              </Field>
              <Field label="Ngày hạch toán" error={formState.errors.postingDate?.message}>
                <input type="date" {...register('postingDate')} className={inputCls} />
              </Field>

              <Field label="Mã số thuế / CCCD">
                <input {...register('taxCode')} className={inputCls} />
              </Field>
              <Field label="Người liên hệ">
                <input {...register('contactPerson')} className={inputCls} />
              </Field>
              <Field label="Ngày chứng từ" error={formState.errors.voucherDate?.message}>
                <input type="date" {...register('voucherDate')} className={inputCls} />
              </Field>

              <Field label="Nhân viên bán hàng">
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
              <Field label="Địa chỉ">
                <input {...register('address')} className={inputCls} />
              </Field>
              <Field label="Số chứng từ">
                <input
                  value={displayNo || 'Tự động'}
                  readOnly
                  title="Số dự kiến — cấp chính thức khi Lưu"
                  className={cn(inputCls, 'bg-slate-50 text-slate-500')}
                />
              </Field>

              <Field label="Diễn giải">
                <input {...register('description')} className={inputCls} />
              </Field>
            </div>

            {/* Điều khoản thanh toán chỉ có nghĩa khi còn nợ (chưa thu tiền) */}
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
          </>
        )}
        </section>

        {/* ── Lớp nền trắng: bảng dòng hàng + tổng hợp (chỉ tab chứng từ) ── */}
        {tab !== 'invoice' && (
          <section className="space-y-4 px-4 py-3">
            {/* ── Line section (§5.6): toolbar + bảng dòng hàng ── */}
            <div className="rounded-md border border-border">
              <div className="flex items-center gap-1 border-b border-border bg-slate-50 px-2">
                <span className="border-b-2 border-primary px-3 py-1.5 text-sm font-medium text-primary">
                  Hàng tiền
                </span>
                {/* Chiết khấu tổng chưa hỗ trợ — giữ chỗ đúng vị trí toolbar của MISA. */}
                <div className="ml-auto flex items-center gap-2 py-1">
                  <span className="text-xs text-slate-500">Chiết khấu</span>
                  <Select value="NONE" disabled>
                    <SelectTrigger
                      className="h-8 w-44 bg-white"
                      title="Chiết khấu tổng chưa hỗ trợ"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Không chiết khấu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-8 px-2 py-1.5 text-center">#</th>
                      <th className="px-2 py-1.5">Mã hàng</th>
                      <th className="px-2 py-1.5">Tên hàng</th>
                      {showAccounts && <th className="w-24 px-2 py-1.5">TK công nợ</th>}
                      {showAccounts && <th className="w-24 px-2 py-1.5">TK doanh thu</th>}
                      <th className="w-16 px-2 py-1.5">ĐVT</th>
                      <th className="w-20 px-2 py-1.5 text-right">Số&nbsp;lượng</th>
                      <th className="w-28 px-2 py-1.5 text-right">Đơn&nbsp;giá</th>
                      <th className="w-28 px-2 py-1.5 text-right">CK&nbsp;thương&nbsp;mại</th>
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
                        <td className="px-2 py-1">
                          <Controller
                            control={control}
                            name={`lines.${i}.tradeDiscount`}
                            render={({ field }) => (
                              <AmountInput value={field.value ?? 0} onChange={field.onChange} />
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
                      <td className="px-2 py-1.5" colSpan={leadCols}>
                        Tổng cộng
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{totalQty}</td>
                      <td />
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {formatCurrency(totalDiscount)}
                      </td>
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
                    append({ ...emptyLine(lineDebtDefault), quantity: 0, unitPrice: 0, vatRate: 0 })
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
              return typeof msg === 'string' ? (
                <p className="text-sm text-red-600">{msg}</p>
              ) : null
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
