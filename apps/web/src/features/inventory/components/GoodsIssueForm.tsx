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
import { AmountInput } from '@/shared/ui/amount-input'
import { Input } from '@/shared/ui/input'
import { Field } from '@/shared/ui/field'
import { CellInput, cellInputCls } from '@/shared/ui/cell-input'
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
  GOODS_ISSUE_VARIANT,
  issueDefaultCreditAccount,
  issueDefaultDebitAccount,
} from '../types'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

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

  // Picker nhân viên (NV bán hàng khi xuất bán hàng / người nhận khi xuất sản xuất).
  const [employeeKw, setEmployeeKw] = useState('')
  const { items: employeeItems, loading: employeeLoading } = useEmployeeOptions(employeeKw)
  const [employeeDialog, setEmployeeDialog] = useState(false)
  const selectReceiver = (p: PartnerOption) => {
    setValue('receiverId', p.code)
    setValue('receiver', p.name)
    // PartnerOption.address của nhân viên mang phòng ban → điền sẵn Bộ phận.
    if (p.address) setValue('department', p.address)
  }

  // Đổi lý do xuất → xóa dữ liệu của cụm không còn hiển thị (tránh gửi field lạc)
  // + đưa TK định khoản các dòng về ngầm định của lý do mới, như MISA.
  const changeCategory = (next: GoodsIssueCategory) => {
    setValue('category', next)
    setValue('description', GOODS_ISSUE_CATEGORY_LABEL[next])
    const toProduction = next === GoodsIssueCategory.Production
    if (toProduction) {
      setValue('customerId', undefined)
      setValue('customerName', undefined)
      setValue('address', undefined)
      setValue('salesEmployeeId', undefined)
      setValue('deliveryLocation', undefined)
    } else {
      setValue('receiverId', undefined)
      setValue('department', undefined)
    }
    getValues('lines')?.forEach((_l, i) => {
      setValue(`lines.${i}.debitAccount`, issueDefaultDebitAccount(next))
      setValue(`lines.${i}.creditAccount`, issueDefaultCreditAccount(next))
      setValue(`lines.${i}.lotNo`, undefined)
      setValue(`lines.${i}.finishedProduct`, undefined)
    })
  }

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
      receiverId: v.receiverId ?? undefined,
      department: v.department ?? undefined,
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
        finishedProduct: l.finishedProduct ?? undefined,
      })),
    })
  }, [editing.data, duplicating, reset])

  const lines = watch('lines')
  const currentCategory = watch('category')
  // Cấu hình trường/cột theo lý do xuất (bán hàng vs sản xuất) — xem types.ts.
  const variant = GOODS_ISSUE_VARIANT[currentCategory]

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
        receiverId: blank(values.receiverId),
        department: blank(values.department),
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
          finishedProduct: blank(l.finishedProduct),
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
          onValueChange={(v) => changeCategory(v as GoodsIssueCategory)}
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
        {/* Lập phiếu xuất từ chứng từ nguồn (CT bán hàng / lệnh sản xuất) — chưa hỗ trợ,
            giữ chỗ đúng vị trí MISA; placeholder đổi theo lý do xuất. */}
        <Input
          disabled
          placeholder={variant.sourcePlaceholder}
          title={`Lập phiếu xuất từ ${variant.sourcePlaceholder.replace('Nhập ', '')} — chưa hỗ trợ`}
          className="w-60 shrink-0 disabled:bg-white disabled:text-slate-400"
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
        {/* ── Thông tin chung (§5.5) — 3 cụm như MISA: đối tượng/diễn giải | ngày + số phiếu | tổng tiền.
            Cụm bên trái đổi theo lý do xuất (bán hàng: khách hàng; sản xuất: người nhận + bộ phận). ── */}
        <section className="space-y-3 bg-primary/5 px-4 pb-4 pt-3">
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-12">
            {/* Cụm trái */}
            <div className="grid grid-cols-1 content-start gap-x-6 gap-y-3 md:col-span-7 md:grid-cols-7">
              {variant.partner === 'customer' ? (
                <>
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
                    <Input {...register('customerName')} />
                  </Field>
                  {/* Người nhận bỏ trống thì phiếu in lấy tên KH. */}
                  <Field label="Người nhận" className="md:col-span-3">
                    <Input
                      {...register('receiver')}
                      placeholder={watch('customerName') || undefined}
                    />
                  </Field>
                </>
              ) : (
                <>
                  {/* Sản xuất: người nhận là nhân viên nội bộ (picker danh mục Nhân viên). */}
                  <Field label="Mã người nhận" className="md:col-span-3">
                    <PartnerPicker
                      value={watch('receiverId')}
                      items={employeeItems}
                      loading={employeeLoading}
                      keyword={employeeKw}
                      onKeywordChange={setEmployeeKw}
                      placeholder="Mã người nhận"
                      disabled={readOnly}
                      onSelect={selectReceiver}
                      onAddNew={readOnly ? undefined : () => setEmployeeDialog(true)}
                    />
                  </Field>
                  <Field label="Tên người nhận" className="md:col-span-4">
                    <Input {...register('receiver')} />
                  </Field>
                </>
              )}

              {variant.showAddress && (
                <Field label="Địa chỉ" className="md:col-span-4">
                  <Input {...register('address')} />
                </Field>
              )}
              {variant.showDepartment && (
                <Field label="Bộ phận" className="md:col-span-3">
                  <Input {...register('department')} />
                </Field>
              )}
              {variant.showSalesEmployee && (
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
              )}
              <Field label="Lý do xuất" className="md:col-span-4">
                <Input {...register('description')} />
              </Field>
            </div>

            {/* Cụm ngày + số chứng từ */}
            <div className="space-y-3 md:col-span-3">
              <Field label="Ngày hạch toán" error={formState.errors.postingDate?.message}>
                <Input type="date" {...register('postingDate')} />
              </Field>
              <Field label="Ngày chứng từ" error={formState.errors.voucherDate?.message}>
                <Input type="date" {...register('voucherDate')} />
              </Field>
              <Field label="Số chứng từ">
                <Input
                  value={displayNo || 'Tự động'}
                  readOnly
                  title="Số dự kiến — cấp chính thức khi Cất"
                  className="bg-slate-50 text-slate-500"
                />
              </Field>
            </div>

            {/* Tổng tiền cỡ lớn cột ngoài cùng phải như MISA. */}
            <div className="md:col-span-2 md:text-right">
              <div className="text-xs text-slate-500">Tổng tiền</div>
              <div className="text-2xl font-bold tabular-nums text-primary">
                {formatCurrency(totalAmount)}
              </div>
            </div>
          </div>

          {/* Kèm theo N chứng từ gốc — cùng dòng như MISA (ô số lượng + nhãn phía sau). */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs font-medium text-slate-500">Kèm theo</span>
            <Input
              type="number"
              min={0}
              placeholder="Số lượng"
              {...register('attachmentCount')}
              className="w-28"
            />
            <span className="text-slate-600">chứng từ gốc</span>
          </div>
        </section>

        {/* ── Lớp nền trắng: bảng hàng tiền + nút dòng ── */}
        <section className="space-y-4 px-4 py-3">
          <div className="rounded-md border border-border">
            <div className="flex items-center gap-2 border-b border-border bg-slate-50 px-3 py-1.5">
              <span className="text-sm font-medium text-slate-600">Hàng tiền</span>
            </div>
            <div className="overflow-x-auto">
              <Table className="min-w-[1080px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 px-2 py-1.5 text-center">#</TableHead>
                    <TableHead className="px-2 py-1.5">Mã hàng</TableHead>
                    <TableHead className="px-2 py-1.5">Tên hàng</TableHead>
                    <TableHead className="w-28 px-2 py-1.5">Kho</TableHead>
                    <TableHead className="w-24 px-2 py-1.5">TK Nợ</TableHead>
                    <TableHead className="w-24 px-2 py-1.5">TK Có</TableHead>
                    <TableHead className="w-16 px-2 py-1.5">ĐVT</TableHead>
                    <TableHead className="w-24 px-2 py-1.5 text-right">Số&nbsp;lượng</TableHead>
                    <TableHead className="w-28 px-2 py-1.5 text-right">Đơn&nbsp;giá</TableHead>
                    <TableHead className="w-32 px-2 py-1.5 text-right">Thành&nbsp;tiền</TableHead>
                    {/* Cột cuối đổi theo lý do xuất: bán hàng → Số lô + Hạn sử dụng; sản xuất → Thành phẩm. */}
                    {variant.showLot && (
                      <>
                        <TableHead className="w-24 px-2 py-1.5">Số&nbsp;lô</TableHead>
                        <TableHead className="w-32 px-2 py-1.5">Hạn sử&nbsp;dụng</TableHead>
                      </>
                    )}
                    {variant.showFinishedProduct && (
                      <TableHead className="w-32 px-2 py-1.5">Thành&nbsp;phẩm</TableHead>
                    )}
                    <TableHead className="w-8 px-2 py-1.5" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((f, i) => {
                    const l = lines?.[i]
                    const amount = num(l?.quantity) * num(l?.unitPrice)
                    return (
                      <TableRow key={f.id}>
                        <TableCell className="px-2 py-1 text-center text-slate-400">{i + 1}</TableCell>
                        <TableCell className="px-2 py-1">
                          <ItemCell value={l?.itemId} onPick={(item) => pickItem(i, item)} />
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
                        <TableCell className="px-2 py-1">
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
                        </TableCell>
                        <TableCell className="px-2 py-1">
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
                        </TableCell>
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
                              <AmountInput value={field.value} onChange={field.onChange} className={cellInputCls} />
                            )}
                          />
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right tabular-nums text-slate-700">
                          {formatCurrency(amount)}
                        </TableCell>
                        {variant.showLot && (
                          <>
                            <TableCell className="px-2 py-1">
                              <CellInput {...register(`lines.${i}.lotNo`)} />
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              <CellInput
                                type="date"
                                {...register(`lines.${i}.expiryDate`)}
                              />
                            </TableCell>
                          </>
                        )}
                        {variant.showFinishedProduct && (
                          <TableCell className="px-2 py-1">
                            <CellInput
                              {...register(`lines.${i}.finishedProduct`)}
                              placeholder="Mã thành phẩm"
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
                    {/* #, Mã hàng, Tên hàng, Kho, TK Nợ, TK Có, ĐVT */}
                    <TableCell className="px-2 py-1.5" colSpan={7}>
                      Tổng cộng
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-right tabular-nums">{totalQty}</TableCell>
                    {/* Đơn giá */}
                    <TableCell />
                    <TableCell className="px-2 py-1.5 text-right tabular-nums">
                      {formatCurrency(totalAmount)}
                    </TableCell>
                    {/* [Số lô, Hạn sử dụng] / [Thành phẩm] + cột xóa dòng */}
                    <TableCell colSpan={(variant.showLot ? 2 : 0) + (variant.showFinishedProduct ? 1 : 0) + 1} />
                  </TableRow>
                </TableFooter>
              </Table>
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

          {/* Địa điểm giao hàng — dưới bảng dòng hàng như MISA; chỉ có khi xuất bán hàng. */}
          {variant.showDeliveryLocation && (
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-12">
              <Field label="Địa điểm giao hàng" className="md:col-span-4">
                <Input {...register('deliveryLocation')} />
              </Field>
            </div>
          )}
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
      inputClassName={cellInputCls}
      allowFreeText
    />
  )
}
