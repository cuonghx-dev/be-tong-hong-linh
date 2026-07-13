import {
  GoodsIssueCategory,
  PartnerType,
  type CreateGoodsIssueInput,
} from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { useCustomers } from '@/features/sales'
import { getApiErrorMessage } from '@/shared/lib/api'
import { cn } from '@/shared/lib/cn'
import { formatCurrency } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import { PlusIcon } from '@/shared/ui/icons'
import { PartnerPicker, type PartnerOption } from '@/shared/ui/partner-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
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
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

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

export function GoodsIssueForm({ category, voucherId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useGoodsIssue(voucherId ?? null)
  const create = useCreateGoodsIssue()
  const update = useUpdateGoodsIssue()
  const { toast } = useToast()

  const form = useForm<GoodsIssueFormValues>({
    resolver: zodResolver(goodsIssueSchema),
    defaultValues: defaultValues(category),
  })
  const { control, register, handleSubmit, reset, watch, setValue, formState } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  // Preview số phiếu kế tiếp khi tạo mới — số thật vẫn cấp lúc Cất.
  const nextNo = useNextGoodsIssueNo(watch('voucherDate'), !voucherId)

  // Picker khách hàng: tra cứu theo mã/tên, tự điền tên + địa chỉ.
  const [customerKw, setCustomerKw] = useState('')
  const customers = useCustomers({ page: 1, pageSize: 20, keyword: customerKw.trim() || undefined })
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

  // Nạp dữ liệu khi sửa.
  useEffect(() => {
    const v = editing.data
    if (!v) return
    reset({
      category: v.category,
      postingDate: v.postingDate.slice(0, 10),
      voucherDate: v.voucherDate.slice(0, 10),
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
  }, [editing.data, reset])

  const lines = watch('lines')
  const currentCategory = watch('category')

  // Tổng tiền = Σ thành tiền.
  const totalAmount = lines?.reduce((s, l) => s + (l.quantity || 0) * (l.unitPrice || 0), 0) ?? 0

  const submit = (goNext: boolean) =>
    handleSubmit(async (values) => {
      const dto: CreateGoodsIssueInput = {
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
          expiryDate: l.expiryDate,
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
    })

  const saving = create.isPending || update.isPending

  return (
    <form className="flex h-full flex-col">
      <fieldset
        disabled={readOnly}
        className="flex-1 space-y-4 overflow-y-auto pr-1 disabled:opacity-90"
      >
        {/* Lý do xuất (loại nghiệp vụ) */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Lý do xuất</span>
            <Select
              value={currentCategory}
              disabled={readOnly}
              onValueChange={(v) => setValue('category', v as GoodsIssueCategory)}
            >
              <SelectTrigger className="h-9 w-64 bg-white">
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
          </label>
        </div>

        {/* Thông tin chung */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          <Field label="Mã khách hàng">
            <PartnerPicker
              value={watch('customerId')}
              items={customerItems}
              loading={customers.isLoading}
              keyword={customerKw}
              onKeywordChange={setCustomerKw}
              placeholder="Mã KH"
              disabled={readOnly}
              onSelect={(p) => {
                setValue('customerId', p.code)
                setValue('customerName', p.name)
                if (p.address) setValue('address', p.address)
              }}
            />
          </Field>
          <Field label="Tên khách hàng">
            <input {...register('customerName')} className={inputCls} />
          </Field>
          <Field label="Người nhận">
            <input {...register('receiver')} className={inputCls} />
          </Field>
          <Field label="Địa chỉ">
            <input {...register('address')} className={inputCls} />
          </Field>
          <Field label="Nhân viên bán hàng">
            <input {...register('salesEmployeeId')} className={inputCls} />
          </Field>
          <Field label="Lý do xuất / Diễn giải">
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
              onClick={() => append(emptyLine(currentCategory))}
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
                  <th className="w-28 px-2 py-1.5 text-right">Đơn giá</th>
                  <th className="w-32 px-2 py-1.5 text-right">Thành tiền</th>
                  <th className="w-24 px-2 py-1.5">Số lô</th>
                  <th className="w-32 px-2 py-1.5">Hạn sử dụng</th>
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
                        <input {...register(`lines.${i}.itemName`)} className={cellCls} />
                      </td>
                      <td className="px-2 py-1">
                        <input {...register(`lines.${i}.warehouseId`)} className={cellCls} />
                      </td>
                      <td className="px-2 py-1">
                        <input {...register(`lines.${i}.debitAccount`)} className={cellCls} />
                      </td>
                      <td className="px-2 py-1">
                        <input {...register(`lines.${i}.creditAccount`)} className={cellCls} />
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
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {typeof formState.errors.lines?.message === 'string' && (
          <p className="text-sm text-red-600">{formState.errors.lines.message}</p>
        )}

        {/* Địa điểm giao hàng */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          <Field label="Địa điểm giao hàng">
            <input {...register('deliveryLocation')} className={inputCls} />
          </Field>
        </div>

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
