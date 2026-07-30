import { GoodsIssueCategory, PartnerType, type CreateGoodsIssueInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { useCustomers } from '@/features/sales'
import { useEmployeeOptions } from '@/shared/api/useEmployeeOptions'
import { useItemOptions } from '@/shared/api/useItemOptions'
import { getApiErrorMessage } from '@/shared/lib/api'
import { cn } from '@/shared/lib/cn'
import { num } from '@/shared/lib/num'
import { invalidToast } from '@/shared/lib/form'
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
import { useGoodsIssue, useNextGoodsIssueNo } from '../api/useGoodsIssues'
import { useCreateGoodsIssue, useUpdateGoodsIssue } from '../api/useGoodsIssueMutations'
import {
  goodsIssueSchema,
  type GoodsIssueFormValues,
  type GoodsIssueLineFormValues,
} from '../schema'
import {
  GOODS_ISSUE_CATEGORY_LABEL,
  GOODS_ISSUE_CATEGORY_OPTIONS,
  issueDefaultCreditAccount,
  issueDefaultDebitAccount,
} from '../types'
import { MoneyInput } from './MoneyInput'

interface Props {
  category: GoodsIssueCategory
  voucherId?: string | null
  // Nhân bản: id phiếu nguồn — nạp sẵn dữ liệu, lưu thành phiếu mới.
  duplicateFromId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

// Ô text rỗng → undefined (DB giữ NULL, không lưu chuỗi rỗng).
const blank = (s?: string) => (s?.trim() ? s.trim() : undefined)

function emptyLine(category: GoodsIssueCategory): GoodsIssueLineFormValues {
  return {
    quantity: 1,
    unitPrice: 0,
    debitAccount: issueDefaultDebitAccount(category),
    creditAccount: issueDefaultCreditAccount(category),
  }
}

function defaultValues(category: GoodsIssueCategory): GoodsIssueFormValues {
  return {
    category,
    postingDate: today(),
    voucherDate: today(),
    description: GOODS_ISSUE_CATEGORY_LABEL[category],
    lines: [emptyLine(category)],
  }
}

// Trang phiếu xuất kho — bố cục §5 design.md (mirror SalesVoucherForm): page header
// (tiêu đề + số phiếu · lý do xuất) → thông tin chung (lưới 4 cụm + tổng tiền) →
// bảng hàng tiền → action bar. Form tự dựng cả header vì các control ở đó đọc-ghi
// trực tiếp state form (lý do xuất, số phiếu).
export function GoodsIssueForm({
  category,
  voucherId,
  duplicateFromId,
  readOnly = false,
  onSaved,
  onCancel,
}: Props) {
  // Nạp dữ liệu từ phiếu đang sửa HOẶC phiếu nguồn khi nhân bản.
  const duplicating = !voucherId && !!duplicateFromId
  const editing = useGoodsIssue(voucherId ?? duplicateFromId ?? null)
  const create = useCreateGoodsIssue()
  const update = useUpdateGoodsIssue()
  const { toast } = useToast()

  const form = useForm<GoodsIssueFormValues>({
    resolver: zodResolver(goodsIssueSchema),
    defaultValues: defaultValues(category),
  })
  const { control, register, handleSubmit, reset, watch, setValue, getValues, formState } = form
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'lines' })

  // Preview số phiếu kế tiếp khi tạo mới — số thật vẫn cấp lúc Cất.
  const nextNo = useNextGoodsIssueNo(watch('voucherDate'), !voucherId)

  // Picker khách hàng: tra cứu theo mã/tên, tự điền tên + địa chỉ.
  const [customerKw, setCustomerKw] = useState('')
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

  // Tạo nhanh khách hàng (dialog mở từ nút + trên picker).
  const [customerDialog, setCustomerDialog] = useState(false)
  const selectCustomer = (p: PartnerOption) => {
    setValue('customerId', p.code)
    setValue('customerName', p.name)
    if (p.address) setValue('address', p.address)
    // Tự sinh Lý do xuất theo khách hàng ("Xuất kho bán hàng cho X") — như MISA, cùng pattern BankVoucherForm.
    setValue('description', `${GOODS_ISSUE_CATEGORY_LABEL[watch('category')]} cho ${p.name}`)
  }

  // Picker nhân viên bán hàng (+ tạo nhanh) — cùng pattern chứng từ bán hàng.
  const [employeeKw, setEmployeeKw] = useState('')
  const { items: employeeItems, loading: employeeLoading } = useEmployeeOptions(employeeKw)
  const [employeeDialog, setEmployeeDialog] = useState(false)

  // Chọn VTHH ở ô Mã hàng → điền dòng hàng theo dữ liệu ngầm định của danh mục
  // (tên, ĐVT, kho ngầm định, TK giá vốn/TK kho, đơn giá mua gần nhất) — như MISA.
  // Gõ mã ngoài danh mục vẫn được: chỉ có `code`, các trường khác giữ nguyên.
  const pickItem = (i: number, item: ItemOption) => {
    setValue(`lines.${i}.itemId`, item.code)
    if (item.name) setValue(`lines.${i}.itemName`, item.name)
    if (item.unit) setValue(`lines.${i}.unit`, item.unit)
    if (item.defaultWarehouseCode) setValue(`lines.${i}.warehouseId`, item.defaultWarehouseCode)
    // Xuất kho: TK Nợ = TK chi phí/giá vốn của VTHH, TK Có = TK kho.
    if (item.costAccount) setValue(`lines.${i}.debitAccount`, item.costAccount)
    if (item.inventoryAccount) setValue(`lines.${i}.creditAccount`, item.inventoryAccount)
    // Đơn giá xuất = giá vốn (đơn giá mua gần nhất); chỉ gợi ý khi dòng còn trống.
    const cost = Number(item.purchasePrice)
    if (Number.isFinite(cost) && cost > 0 && !getValues(`lines.${i}.unitPrice`))
      setValue(`lines.${i}.unitPrice`, cost)
  }

  // Nạp dữ liệu khi sửa hoặc nhân bản.
  useEffect(() => {
    const v = editing.data
    if (!v) return
    reset({
      category: v.category,
      // Nhân bản → ngày về hôm nay (phiếu mới), sửa → giữ nguyên ngày gốc.
      postingDate: duplicating ? today() : v.postingDate.slice(0, 10),
      voucherDate: duplicating ? today() : v.voucherDate.slice(0, 10),
      customerId: v.customerId ?? undefined,
      customerName: v.customerName ?? undefined,
      receiver: v.receiver ?? undefined,
      address: v.address ?? undefined,
      salesEmployeeId: v.salesEmployeeId ?? undefined,
      description: v.description ?? undefined,
      attachmentCount: v.attachmentCount,
      deliveryLocation: v.deliveryLocation ?? undefined,
      lines: v.lines.map((l) => ({
        itemId: l.itemId ?? undefined,
        itemName: l.itemName ?? undefined,
        warehouseId: l.warehouseId ?? undefined,
        debitAccount: l.debitAccount,
        creditAccount: l.creditAccount,
        unit: l.unit ?? undefined,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        lotNo: l.lotNo ?? undefined,
        expiryDate: l.expiryDate ?? undefined,
      })),
    })
  }, [editing.data, duplicating, reset])

  const lines = watch('lines')
  const currentCategory = watch('category')

  // Tổng tiền = Σ thành tiền; tổng SL cho dòng tổng cộng của bảng (như MISA).
  const totalAmount = lines?.reduce((s, l) => s + num(l.quantity) * num(l.unitPrice), 0) ?? 0
  const totalQty = lines?.reduce((s, l) => s + num(l.quantity), 0) ?? 0

  const submit = (goNext: boolean) =>
    handleSubmit(async (values) => {
      const dto: CreateGoodsIssueInput = {
        ...values,
        receiver: blank(values.receiver),
        address: blank(values.address),
        salesEmployeeId: blank(values.salesEmployeeId),
        description: blank(values.description),
        deliveryLocation: blank(values.deliveryLocation),
        lines: values.lines.map((l) => ({
          itemId: l.itemId,
          itemName: l.itemName,
          warehouseId: l.warehouseId,
          debitAccount: l.debitAccount,
          creditAccount: l.creditAccount,
          unit: l.unit,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lotNo: l.lotNo,
          // Input date bỏ trống trả chuỗi rỗng — backend @IsDateString từ chối "".
          expiryDate: l.expiryDate || undefined,
        })),
      }
      try {
        if (voucherId) await update.mutateAsync({ id: voucherId, dto })
        else await create.mutateAsync(dto)
        if (goNext && !voucherId) reset(defaultValues(values.category))
        else onSaved()
      } catch (e) {
        toast({
          variant: 'error',
          title: 'Lưu chứng từ thất bại',
          description: getApiErrorMessage(e),
        })
      }
    }, invalidToast(toast)) // toast lỗi validate — tránh bấm Cất không thấy phản hồi

  const saving = create.isPending || update.isPending
  const displayNo = editing.data?.voucherNo ?? nextNo.data ?? ''

  return (
    <form className="flex h-screen flex-col bg-white">
      {/* ── Page header (§5.2): tiêu đề + số phiếu · lý do xuất · ✕ — nền primary nhạt (2 lớp màu) ── */}
      <header className="flex h-14 shrink-0 items-center gap-3 bg-primary/5 px-4">
        <h1 className="shrink-0 whitespace-nowrap text-lg font-bold text-slate-800">
          Phiếu xuất kho <span className="text-primary">{displayNo}</span>
        </h1>
        <Select
          value={currentCategory}
          disabled={readOnly || !!voucherId}
          onValueChange={(v) => setValue('category', v as GoodsIssueCategory)}
        >
          <SelectTrigger className="h-9 w-64 shrink-0 bg-white" title="Lý do xuất">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GOODS_ISSUE_CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.category} value={opt.category}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Lập phiếu xuất từ chứng từ bán hàng đã có — chưa hỗ trợ, giữ chỗ đúng vị trí MISA. */}
        <input
          disabled
          placeholder="Nhập số chứng từ bán hàng"
          title="Lập phiếu xuất từ chứng từ bán hàng — chưa hỗ trợ"
          className={cn(inputCls, 'w-60 shrink-0 disabled:bg-white disabled:text-slate-400')}
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

      <fieldset disabled={readOnly} className="flex-1 overflow-y-auto disabled:opacity-90">
        {/* ── Thông tin chung (§5.5) — lưới 4 cụm như MISA: mã KH | tên/địa chỉ/lý do | ngày + số phiếu ── */}
        <section className="space-y-3 bg-primary/5 px-4 pb-4 pt-3">
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
                disabled={readOnly}
                onSelect={selectCustomer}
                onAddNew={readOnly ? undefined : () => setCustomerDialog(true)}
              />
            </Field>
            <Field label="Tên khách hàng" className="md:col-span-4">
              <input {...register('customerName')} className={inputCls} />
            </Field>
            <div className="hidden md:col-span-2 md:block" />
            <Field
              label="Ngày hạch toán"
              error={formState.errors.postingDate?.message}
              className="md:col-span-3"
            >
              <input type="date" {...register('postingDate')} className={inputCls} />
            </Field>

            {/* Hàng 2 — người nhận bỏ trống thì phiếu in lấy tên KH. */}
            <Field label="Người nhận" className="md:col-span-3">
              <input
                {...register('receiver')}
                placeholder={watch('customerName') || undefined}
                className={inputCls}
              />
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
                disabled={readOnly}
                onSelect={(p) => setValue('salesEmployeeId', p.code)}
                onAddNew={readOnly ? undefined : () => setEmployeeDialog(true)}
              />
            </Field>
            <Field label="Lý do xuất" className="md:col-span-4">
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

            {/* Hàng 4 — kèm theo N chứng từ gốc + địa điểm giao hàng; tổng tiền cỡ lớn góc phải như MISA. */}
            <Field label="Kèm theo (chứng từ gốc)" className="md:col-span-3">
              <input type="number" min={0} {...register('attachmentCount')} className={inputCls} />
            </Field>
            <Field label="Địa điểm giao hàng" className="md:col-span-4">
              <input {...register('deliveryLocation')} className={inputCls} />
            </Field>
            <div className="hidden md:col-span-2 md:block" />
            <div className="md:col-span-3 md:self-end md:text-right">
              <div className="text-xs text-slate-500">Tổng tiền</div>
              <div className="text-2xl font-bold tabular-nums text-primary">
                {formatCurrency(totalAmount)}
              </div>
            </div>
          </div>
        </section>

        {/* ── Lớp nền trắng: bảng hàng tiền + nút dòng ── */}
        <section className="space-y-4 px-4 py-3">
          <div className="rounded-md border border-border">
            <div className="flex items-center gap-2 border-b border-border bg-slate-50 px-3 py-1.5">
              <span className="text-sm font-medium text-slate-600">Hàng tiền</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-8 px-2 py-1.5 text-center">#</th>
                    <th className="px-2 py-1.5">Mã hàng</th>
                    <th className="px-2 py-1.5">Tên hàng</th>
                    <th className="w-28 px-2 py-1.5">Kho</th>
                    <th className="w-24 px-2 py-1.5">TK Nợ</th>
                    <th className="w-24 px-2 py-1.5">TK Có</th>
                    <th className="w-16 px-2 py-1.5">ĐVT</th>
                    <th className="w-24 px-2 py-1.5 text-right">Số&nbsp;lượng</th>
                    <th className="w-28 px-2 py-1.5 text-right">Đơn&nbsp;giá</th>
                    <th className="w-32 px-2 py-1.5 text-right">Thành&nbsp;tiền</th>
                    <th className="w-24 px-2 py-1.5">Số&nbsp;lô</th>
                    <th className="w-32 px-2 py-1.5">Hạn sử&nbsp;dụng</th>
                    <th className="w-8 px-2 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {fields.map((f, i) => {
                    const l = lines?.[i]
                    const amount = num(l?.quantity) * num(l?.unitPrice)
                    return (
                      <tr key={f.id} className="border-t border-border">
                        <td className="px-2 py-1 text-center text-slate-400">{i + 1}</td>
                        <td className="px-2 py-1">
                          <ItemCell value={l?.itemId} onPick={(item) => pickItem(i, item)} />
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
                            name={`lines.${i}.debitAccount`}
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
                            name={`lines.${i}.creditAccount`}
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
                          <input {...register(`lines.${i}.lotNo`)} className={cellCls} />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="date"
                            {...register(`lines.${i}.expiryDate`)}
                            className={cellCls}
                          />
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
                    )
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-medium">
                  <tr className="border-t border-border">
                    {/* #, Mã hàng, Tên hàng, Kho, TK Nợ, TK Có, ĐVT */}
                    <td className="px-2 py-1.5" colSpan={7}>
                      Tổng cộng
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{totalQty}</td>
                    {/* Đơn giá */}
                    <td />
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {formatCurrency(totalAmount)}
                    </td>
                    {/* Số lô, Hạn sử dụng, cột xóa dòng */}
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Nút dòng (§5.6) — như MISA: Thêm dòng · Thêm ghi chú · Xóa hết dòng */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border px-2 py-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append(emptyLine(currentCategory))}
              >
                <PlusIcon size={14} /> Thêm dòng
              </Button>
              {/* Ghi chú = dòng chỉ có Tên hàng, SL/đơn giá 0 → không đổi tổng tiền. */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ ...emptyLine(currentCategory), quantity: 0, unitPrice: 0 })}
              >
                Thêm ghi chú
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => replace([emptyLine(currentCategory)])}
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

          {/* Summary (phải) */}
          <div className="ml-auto grid w-full max-w-sm grid-cols-2 gap-y-1.5 text-sm">
            <span className="font-semibold text-slate-700">Tổng tiền</span>
            <span className="text-right font-semibold tabular-nums text-primary">
              {formatCurrency(totalAmount)}
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
