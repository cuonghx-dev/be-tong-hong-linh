import { InventoryReceiptType, type CreateInventoryReceiptInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState, type ReactNode } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { getApiErrorMessage } from '@/shared/lib/api'
import { cn } from '@/shared/lib/cn'
import { num } from '@/shared/lib/num'
import { invalidToast } from '@/shared/lib/form'
import { formatCurrency } from '@/shared/lib/currency'
import { usePartnerOptions } from '@/shared/api/usePartnerOptions'
import { useItemOptions } from '@/shared/api/useItemOptions'
import { AccountPicker, accountCellCls } from '@/shared/ui/account-picker'
import { Button } from '@/shared/ui/button'
import { PlusIcon, TrashIcon, XIcon } from '@/shared/ui/icons'
import { ItemPicker, type ItemOption } from '@/shared/ui/item-picker'
import { PartnerPicker, type PartnerOption } from '@/shared/ui/partner-picker'
import { QuickAddPartnerDialog } from '@/shared/ui/quick-add-partner-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { WarehousePicker, warehouseCellCls } from '@/shared/ui/warehouse-picker'
import { useToast } from '@/shared/ui/toast'
import { AmountInput } from '@/shared/ui/amount-input'
import { Input } from '@/shared/ui/input'
import { Field } from '@/shared/ui/field'
import { CellInput, cellInputCls } from '@/shared/ui/cell-input'
import { Label } from '@/shared/ui/label'
import { useNextReceiptNo, useReceipt } from '../api/useReceipts'
import { useCreateReceipt, useUpdateReceipt } from '../api/useReceiptMutations'
import { receiptSchema, type ReceiptFormValues, type ReceiptLineFormValues } from '../schema'
import {
  DEFAULT_RECEIPT_TYPE,
  MANUAL_RECEIPT_TYPES,
  RECEIPT_TYPE_OPTIONS,
  defaultCreditAccount,
  defaultDebitAccount,
  RECEIPT_VARIANT,
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

interface Props {
  type: InventoryReceiptType
  receiptId?: string | null
  // Nhân bản: id phiếu nguồn — nạp sẵn dữ liệu, lưu thành phiếu mới.
  duplicateFromId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
  // Nút hành động thêm ở thanh đáy khi xem (vd. Sửa nhanh / Ghi sổ) — page truyền vào.
  actions?: ReactNode
}

const today = () => new Date().toISOString().slice(0, 10)

function emptyLine(type: InventoryReceiptType): ReceiptLineFormValues {
  return {
    quantity: 1,
    unitPrice: 0,
    debitAccount: defaultDebitAccount(type),
    creditAccount: defaultCreditAccount(type),
  }
}

function defaultValues(type: InventoryReceiptType): ReceiptFormValues {
  return {
    receiptType: type,
    postingDate: today(),
    voucherDate: today(),
    description: 'Nhập kho',
    attachmentCount: 0,
    lines: [emptyLine(type)],
  }
}

export function ReceiptForm({
  type,
  receiptId,
  duplicateFromId,
  readOnly = false,
  onSaved,
  onCancel,
  actions,
}: Props) {
  // Nạp dữ liệu từ phiếu đang sửa HOẶC phiếu nguồn khi nhân bản.
  const duplicating = !receiptId && !!duplicateFromId
  const editing = useReceipt(receiptId ?? duplicateFromId ?? null)
  const create = useCreateReceipt()
  const update = useUpdateReceipt()
  const { toast } = useToast()

  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema),
    defaultValues: defaultValues(type),
  })
  const { control, register, handleSubmit, reset, watch, setValue, getValues, formState } = form
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'lines' })

  // Preview số phiếu kế tiếp khi tạo mới — số thật vẫn cấp lúc Cất (dãy NK chạy toàn cục).
  const nextNo = useNextReceiptNo(!receiptId)

  // Picker đối tượng (+ tạo nhanh) — cùng pattern chứng từ thu/chi.
  const [partnerKw, setPartnerKw] = useState('')
  const { items: partnerItems, loading: partnerLoading } = usePartnerOptions(partnerKw)
  const [partnerDialog, setPartnerDialog] = useState(false)
  // Chọn đối tượng: điền header + tự sinh Diễn giải ("Nhập kho của X") — như MISA.
  const selectPartner = (p: PartnerOption) => {
    setValue('partnerId', p.code)
    setValue('partnerName', p.name)
    if (p.address) setValue('address', p.address)
    setValue('description', `Nhập kho của ${p.name}`)
  }

  // Chọn VTHH ở ô Mã hàng: điền tên/ĐVT/kho + TK kho (Nợ); TK Có giữ theo loại phiếu.
  const pickItem = (i: number, item: ItemOption) => {
    setValue(`lines.${i}.itemId`, item.code)
    if (item.name) setValue(`lines.${i}.itemName`, item.name)
    if (item.unit) setValue(`lines.${i}.unit`, item.unit)
    if (item.defaultWarehouseCode) setValue(`lines.${i}.warehouseId`, item.defaultWarehouseCode)
    if (item.inventoryAccount) setValue(`lines.${i}.debitAccount`, item.inventoryAccount)
    // Đơn giá nhập gợi ý = đơn giá mua gần nhất; chỉ điền khi dòng còn trống.
    const price = Number(item.purchasePrice)
    if (Number.isFinite(price) && price > 0 && !getValues(`lines.${i}.unitPrice`))
      setValue(`lines.${i}.unitPrice`, price)
  }

  // Nạp dữ liệu khi xem/sửa.
  useEffect(() => {
    const v = editing.data
    if (!v) return
    reset({
      receiptType: v.receiptType,
      // Nhân bản → ngày về hôm nay (phiếu mới), sửa → giữ nguyên ngày gốc.
      postingDate: duplicating ? today() : v.postingDate.slice(0, 10),
      voucherDate: duplicating ? today() : v.voucherDate.slice(0, 10),
      partnerId: v.partnerId ?? undefined,
      partnerName: v.partnerName ?? undefined,
      address: v.address ?? undefined,
      deliverer: v.deliverer ?? undefined,
      description: v.description ?? undefined,
      attachmentCount: v.attachmentCount,
      branchId: v.branchId ?? undefined,
      lines: v.lines.map((l) => ({
        itemId: l.itemId ?? undefined,
        itemName: l.itemName ?? undefined,
        warehouseId: l.warehouseId ?? undefined,
        debitAccount: l.debitAccount ?? undefined,
        creditAccount: l.creditAccount ?? undefined,
        unit: l.unit ?? undefined,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        lotNo: l.lotNo ?? undefined,
        expiryDate: l.expiryDate ?? undefined,
      })),
    })
  }, [editing.data, reset, duplicating])

  const lines = watch('lines')
  const currentType = watch('receiptType')
  // Liệt kê ĐỦ mọi loại (kể cả loại không lập tay) — KHÔNG lọc theo currentType: hidden
  // native select của Radix chỉ có option đã render, nếu value đổi sang loại vừa được thêm
  // trong cùng render nó tự reset và bắn onValueChange('') → mất receiptType.
  // Loại không lập tay chỉ bị disable trong dropdown.
  const typeSelectable = (t: InventoryReceiptType) => MANUAL_RECEIPT_TYPES.includes(t)
  const typeLocked = readOnly || !!receiptId || !typeSelectable(currentType)
  // Trường/cột hiển thị đổi theo loại phiếu (form MISA khác nhau giữa mua hàng và thành phẩm SX).
  const variant = RECEIPT_VARIANT[currentType] ?? RECEIPT_VARIANT[DEFAULT_RECEIPT_TYPE]

  // Tổng tiền = Σ thành tiền; tổng SL cho dòng tổng cộng của bảng (như MISA).
  const totalAmount = lines?.reduce((s, l) => s + num(l.quantity) * num(l.unitPrice), 0) ?? 0
  const totalQty = lines?.reduce((s, l) => s + num(l.quantity), 0) ?? 0

  const submit = (goNext: boolean) =>
    handleSubmit(async (values) => {
      const dto: CreateInventoryReceiptInput = {
        ...values,
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
          expiryDate: l.expiryDate || undefined,
        })),
      }
      try {
        if (receiptId) await update.mutateAsync({ id: receiptId, dto })
        else await create.mutateAsync(dto)
        if (goNext && !receiptId) reset(defaultValues(values.receiptType))
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

  // Chờ nạp chứng từ — tránh chớp form rỗng rồi mới điền dữ liệu.
  if (editing.isLoading) return <RecordFormSkeleton withHeader />

  return (
    <form className="flex h-screen flex-col bg-white">
      {/* ── Page header (§5.2): tiêu đề + số phiếu · loại chứng từ · ✕ — nền primary nhạt (2 lớp màu) ── */}
      <header className="flex h-14 shrink-0 items-center gap-3 bg-primary/5 px-4">
        <h1 className="shrink-0 whitespace-nowrap text-lg font-bold text-slate-800">
          Phiếu nhập kho <span className="text-primary">{displayNo}</span>
        </h1>
        <Select
          value={currentType}
          disabled={typeLocked}
          onValueChange={(v) => v && setValue('receiptType', v as InventoryReceiptType)}
        >
          <SelectTrigger className="h-9 w-72 shrink-0 bg-white" title="Loại chứng từ">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECEIPT_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.type} value={o.type} disabled={!typeSelectable(o.type)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Lập phiếu từ chứng từ nguồn (lệnh SX / phiếu xuất CN khác) — chưa hỗ trợ, giữ chỗ như MISA. */}
        <Input
          disabled
          placeholder={variant.sourcePlaceholder}
          title={`${variant.sourcePlaceholder} — chưa hỗ trợ`}
          className="w-80 shrink-0 disabled:bg-white disabled:text-slate-400"
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
        {/* ── Thông tin chung (§5.5) — lưới như MISA: đối tượng | diễn giải | ngày + số phiếu | tổng tiền ── */}
        <section className="space-y-3 bg-primary/5 px-4 pb-4 pt-3">
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-12">
            {/* Hàng 1 */}
            <Field label={variant.partnerLabel} className="md:col-span-3">
              <PartnerPicker
                value={watch('partnerId')}
                items={partnerItems}
                loading={partnerLoading}
                keyword={partnerKw}
                onKeywordChange={setPartnerKw}
                placeholder={variant.partnerLabel}
                disabled={readOnly}
                onSelect={selectPartner}
                onAddNew={readOnly ? undefined : () => setPartnerDialog(true)}
              />
            </Field>
            <Field label={variant.partnerNameLabel} className="md:col-span-4">
              <Input {...register('partnerName')} />
            </Field>
            <Field
              label="Ngày hạch toán"
              error={formState.errors.postingDate?.message}
              className="md:col-span-3"
            >
              <Input type="date" {...register('postingDate')} />
            </Field>
            {/* Tổng tiền cỡ lớn cột ngoài cùng phải như MISA (chỉ hàng 1). */}
            <div className="md:col-span-2 md:text-right">
              <div className="text-xs text-slate-500">Tổng tiền</div>
              <div className="text-2xl font-bold tabular-nums text-primary">
                {formatCurrency(totalAmount)}
              </div>
            </div>

            {/* Hàng 2 — Địa chỉ (rộng) + Ngày chứng từ. */}
            <Field label="Địa chỉ" className="md:col-span-7">
              <Input {...register('address')} />
            </Field>
            <Field
              label="Ngày chứng từ"
              error={formState.errors.voucherDate?.message}
              className="md:col-span-3"
            >
              <Input type="date" {...register('voucherDate')} />
            </Field>
            <div className="hidden md:col-span-2 md:block" />

            {/* Hàng 3 — Người giao hàng (nếu cụm đối tượng không phải người giao hàng) + Diễn giải. */}
            {variant.showDeliverer && (
              <Field label="Người giao hàng" className="md:col-span-3">
                <Input {...register('deliverer')} />
              </Field>
            )}
            <Field
              label="Diễn giải"
              className={variant.showDeliverer ? 'md:col-span-4' : 'md:col-span-7'}
            >
              <Input {...register('description')} />
            </Field>
            <Field label="Số chứng từ" className="md:col-span-3">
              <Input
                value={displayNo || 'Tự động'}
                readOnly
                title="Số dự kiến — cấp chính thức khi Cất"
                className="bg-slate-50 text-slate-500"
              />
            </Field>
            <div className="hidden md:col-span-2 md:block" />

            {/* Hàng 4 — Kèm theo N chứng từ gốc. */}
            <div className="flex flex-wrap items-end gap-3 md:col-span-7">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500">Kèm theo</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Input
                    type="number"
                    min={0}
                    placeholder="Số lượng"
                    {...register('attachmentCount')}
                    className="w-28"
                  />
                  <span className="text-slate-600">chứng từ gốc</span>
                </div>
              </div>
            </div>
            {variant.showBranch && (
              <Field label="Chi nhánh" className="md:col-span-3">
                <Input {...register('branchId')} />
              </Field>
            )}
            <div className="hidden md:col-span-2 md:block" />
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
                    {variant.showLot && (
                      <>
                        <TableHead className="w-24 px-2 py-1.5">Số&nbsp;lô</TableHead>
                        <TableHead className="w-32 px-2 py-1.5">Hạn sử&nbsp;dụng</TableHead>
                      </>
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
                        <TableCell className="px-2 py-1 text-center text-slate-400">
                          {i + 1}
                        </TableCell>
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
                        {variant.showLot && (
                          <>
                            <TableCell className="px-2 py-1">
                              <CellInput {...register(`lines.${i}.lotNo`)} />
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              <CellInput type="date" {...register(`lines.${i}.expiryDate`)} />
                            </TableCell>
                          </>
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
                    <TableCell className="px-2 py-1.5 text-right tabular-nums">
                      {totalQty}
                    </TableCell>
                    {/* Đơn giá */}
                    <TableCell />
                    <TableCell className="px-2 py-1.5 text-right tabular-nums">
                      {formatCurrency(totalAmount)}
                    </TableCell>
                    {/* Số lô, Hạn sử dụng (nếu có) + cột xóa dòng */}
                    <TableCell colSpan={variant.showLot ? 3 : 1} />
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
                onClick={() => append(emptyLine(currentType))}
              >
                <PlusIcon size={14} /> Thêm dòng
              </Button>
              {/* Ghi chú = dòng chỉ có Tên hàng, SL/đơn giá 0 → không đổi tổng tiền. */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ ...emptyLine(currentType), quantity: 0, unitPrice: 0 })}
              >
                Thêm ghi chú
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => replace([emptyLine(currentType)])}
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
              {!receiptId && (
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

      <QuickAddPartnerDialog
        open={partnerDialog}
        onClose={() => setPartnerDialog(false)}
        initialCode={partnerKw.trim() || undefined}
        onCreated={(p) => {
          setPartnerKw('')
          selectPartner(p)
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
