import { InventoryReceiptType, type CreateInventoryReceiptInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { getApiErrorMessage } from '@/shared/lib/api'
import { cn } from '@/shared/lib/cn'
import { invalidToast } from '@/shared/lib/form'
import { formatCurrency } from '@/shared/lib/currency'
import { AccountPicker, accountCellCls } from '@/shared/ui/account-picker'
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
import { useNextReceiptNo, useReceipt } from '../api/useReceipts'
import { useCreateReceipt, useUpdateReceipt } from '../api/useReceiptMutations'
import { receiptSchema, type ReceiptFormValues, type ReceiptLineFormValues } from '../schema'
import { RECEIPT_TYPE_OPTIONS, defaultCreditAccount, defaultDebitAccount } from '../types'
import { MoneyInput } from './MoneyInput'

interface Props {
  type: InventoryReceiptType
  receiptId?: string | null
  // Nhân bản: id phiếu nguồn — nạp sẵn dữ liệu, lưu thành phiếu mới.
  duplicateFromId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
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
  const { control, register, handleSubmit, reset, watch, setValue, formState } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  // Preview số phiếu kế tiếp khi tạo mới — số thật vẫn cấp lúc Lưu (dãy NK chạy toàn cục).
  const nextNo = useNextReceiptNo(!receiptId)

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
      reference: v.reference ?? undefined,
      attachmentCount: v.attachmentCount,
      branchName: v.branchName ?? undefined,
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
  const totalAmount = lines?.reduce((s, l) => s + (l.quantity || 0) * (l.unitPrice || 0), 0) ?? 0

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
    }, invalidToast(toast)) // toast lỗi validate — tránh bấm Lưu không thấy phản hồi

  const saving = create.isPending || update.isPending

  return (
    <form className="flex h-full flex-col">
      <fieldset
        disabled={readOnly}
        className="flex-1 space-y-4 overflow-y-auto pr-1 disabled:opacity-90"
      >
        {/* Loại chứng từ */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Loại chứng từ</span>
            <Select
              value={currentType}
              onValueChange={(v) => setValue('receiptType', v as InventoryReceiptType)}
              disabled={readOnly}
            >
              <SelectTrigger className="h-9 w-72 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECEIPT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.type} value={o.type}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

        {/* Thông tin chung */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          <Field label="Mã đối tượng">
            <input {...register('partnerId')} className={inputCls} />
          </Field>
          <Field label="Tên đối tượng">
            <input {...register('partnerName')} className={inputCls} />
          </Field>
          <Field label="Người giao hàng">
            <input {...register('deliverer')} className={inputCls} />
          </Field>
          <Field label="Địa chỉ">
            <input {...register('address')} className={inputCls} />
          </Field>
          <Field label="Diễn giải">
            <input {...register('description')} className={inputCls} />
          </Field>
          <Field label="Tham chiếu">
            <input {...register('reference')} className={inputCls} />
          </Field>
          <Field label="Số chứng từ">
            <input
              value={receiptId ? (editing.data?.voucherNo ?? '…') : (nextNo.data ?? 'Tự động')}
              readOnly
              title="Số dự kiến — cấp chính thức khi Lưu"
              className={cn(inputCls, 'bg-slate-50 text-slate-500')}
            />
          </Field>
          <Field label="Chi nhánh">
            <input {...register('branchName')} className={inputCls} />
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
        </div>

        {/* Bảng hàng tiền */}
        <div className="rounded-md border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-slate-50 px-2 py-1.5">
            <span className="text-sm font-medium text-slate-600">Hàng tiền</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append(emptyLine(currentType))}
            >
              <PlusIcon size={14} /> Thêm dòng
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-8 px-2 py-1.5 text-center">#</th>
                  <th className="px-2 py-1.5">Mã hàng</th>
                  <th className="px-2 py-1.5">Tên hàng</th>
                  <th className="px-2 py-1.5">Kho</th>
                  <th className="w-20 px-2 py-1.5">TK Nợ</th>
                  <th className="w-20 px-2 py-1.5">TK Có</th>
                  <th className="w-16 px-2 py-1.5">ĐVT</th>
                  <th className="w-20 px-2 py-1.5 text-right">SL</th>
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
                  const amount = (l?.quantity || 0) * (l?.unitPrice || 0)
                  return (
                    <tr key={f.id} className="border-t border-border">
                      <td className="px-2 py-1 text-center text-slate-400">{i + 1}</td>
                      <td className="px-2 py-1">
                        <input {...register(`lines.${i}.itemId`)} className={cellCls} />
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
                        <input {...register(`lines.${i}.warehouseId`)} className={cellCls} />
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
                        <input type="date" {...register(`lines.${i}.expiryDate`)} className={cellCls} />
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
                  <td className="px-2 py-1.5" colSpan={9}>
                    Tổng cộng
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(totalAmount)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Lỗi cấp mảng (thiếu dòng hàng thật) nằm ở root khi có thêm lỗi từng dòng. */}
        {(() => {
          const msg = formState.errors.lines?.message ?? formState.errors.lines?.root?.message
          return typeof msg === 'string' ? <p className="text-sm text-red-600">{msg}</p> : null
        })()}

        {/* Tổng hợp */}
        <div className="ml-auto grid w-full max-w-sm grid-cols-2 gap-y-1.5 text-sm">
          <span className="font-semibold text-slate-700">Tổng tiền</span>
          <span className="text-right font-semibold tabular-nums text-primary">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </fieldset>

      {/* Nút hành động — footer cố định */}
      <div className="mt-3 flex shrink-0 justify-end gap-2 border-t border-border pt-3">
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
              {saving ? 'Đang lưu…' : 'Lưu'}
            </Button>
            {!receiptId && (
              <Button type="button" variant="secondary" onClick={submit(true)} disabled={saving}>
                Lưu và Thêm
              </Button>
            )}
          </>
        )}
      </div>
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
