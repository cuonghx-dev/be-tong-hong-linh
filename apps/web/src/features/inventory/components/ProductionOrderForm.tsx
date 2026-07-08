import { ProductionOrderLineType, ProductionOrderStatus, type CreateProductionOrderInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { PlusIcon } from '@/shared/ui/icons'
import { useProductionOrder } from '../api/useProductionOrders'
import {
  useCreateProductionOrder,
  useUpdateProductionOrder,
} from '../api/useProductionOrderMutations'
import {
  productionOrderSchema,
  type ProductionOrderFormValues,
  type ProductionOrderLineFormValues,
} from '../schema'
import { PRODUCTION_ORDER_LINE_TYPE_LABEL, PRODUCTION_ORDER_STATUS_LABEL } from '../types'

interface Props {
  orderId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

function emptyLine(): ProductionOrderLineFormValues {
  return { lineType: ProductionOrderLineType.Product, quantity: 1 }
}

function defaultValues(): ProductionOrderFormValues {
  return {
    orderDate: today(),
    description: 'Lệnh sản xuất',
    receiptComplete: false,
    issueComplete: false,
    status: ProductionOrderStatus.InProgress,
    lines: [emptyLine()],
  }
}

export function ProductionOrderForm({ orderId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useProductionOrder(orderId ?? null)
  const create = useCreateProductionOrder()
  const update = useUpdateProductionOrder()

  const form = useForm<ProductionOrderFormValues>({
    resolver: zodResolver(productionOrderSchema),
    defaultValues: defaultValues(),
  })
  const { control, register, handleSubmit, reset, formState } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  // Nạp dữ liệu khi xem/sửa.
  useEffect(() => {
    const v = editing.data
    if (!v) return
    reset({
      orderDate: v.orderDate.slice(0, 10),
      description: v.description ?? undefined,
      receiptComplete: v.receiptComplete,
      issueComplete: v.issueComplete,
      status: v.status,
      branchName: v.branchName ?? undefined,
      lines: v.lines.map((l) => ({
        lineType: l.lineType,
        itemId: l.itemId ?? undefined,
        itemName: l.itemName ?? undefined,
        unit: l.unit ?? undefined,
        quantity: Number(l.quantity),
        note: l.note ?? undefined,
      })),
    })
  }, [editing.data, reset])

  const submit = (goNext: boolean) =>
    handleSubmit(async (values) => {
      const dto: CreateProductionOrderInput = {
        orderDate: values.orderDate,
        description: values.description,
        receiptComplete: values.receiptComplete,
        issueComplete: values.issueComplete,
        status: values.status,
        branchName: values.branchName,
        lines: values.lines.map((l) => ({
          lineType: l.lineType,
          itemId: l.itemId,
          itemName: l.itemName,
          unit: l.unit,
          quantity: l.quantity,
          note: l.note,
        })),
      }
      if (orderId) await update.mutateAsync({ id: orderId, dto })
      else await create.mutateAsync(dto)
      if (goNext && !orderId) reset(defaultValues())
      else onSaved()
    })

  const saving = create.isPending || update.isPending

  return (
    <form className="flex h-full flex-col">
      <fieldset
        disabled={readOnly}
        className="flex-1 space-y-4 overflow-y-auto pr-1 disabled:opacity-90"
      >
        {/* Thông tin chung */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          <Field label="Ngày" error={formState.errors.orderDate?.message}>
            <input type="date" {...register('orderDate')} className={inputCls} />
          </Field>
          <Field label="Số lệnh">
            <input
              value={editing.data?.voucherNo ?? 'Tự động'}
              readOnly
              className={cn(inputCls, 'bg-slate-50 text-slate-500')}
            />
          </Field>
          <Field label="Diễn giải">
            <input {...register('description')} className={inputCls} />
          </Field>
          <Field label="Tình trạng">
            <select {...register('status')} className={inputCls}>
              {Object.values(ProductionOrderStatus).map((s) => (
                <option key={s} value={s}>
                  {PRODUCTION_ORDER_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" {...register('receiptComplete')} className="h-4 w-4" />
              Đã lập đủ PN
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" {...register('issueComplete')} className="h-4 w-4" />
              Đã lập đủ PX
            </label>
          </div>
        </div>

        {/* Bảng dòng lệnh */}
        <div className="rounded-md border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-slate-50 px-2 py-1.5">
            <span className="text-sm font-medium text-slate-600">Chi tiết</span>
            <Button type="button" variant="outline" size="sm" onClick={() => append(emptyLine())}>
              <PlusIcon size={14} /> Thêm dòng
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-8 px-2 py-1.5 text-center">#</th>
                  <th className="w-36 px-2 py-1.5">Loại</th>
                  <th className="px-2 py-1.5">Mã hàng</th>
                  <th className="px-2 py-1.5">Tên hàng</th>
                  <th className="w-16 px-2 py-1.5">ĐVT</th>
                  <th className="w-24 px-2 py-1.5 text-right">SL</th>
                  <th className="px-2 py-1.5">Ghi chú</th>
                  <th className="w-8 px-2 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {fields.map((f, i) => (
                  <tr key={f.id} className="border-t border-border">
                    <td className="px-2 py-1 text-center text-slate-400">{i + 1}</td>
                    <td className="px-2 py-1">
                      <select {...register(`lines.${i}.lineType`)} className={cellCls}>
                        {Object.values(ProductionOrderLineType).map((t) => (
                          <option key={t} value={t}>
                            {PRODUCTION_ORDER_LINE_TYPE_LABEL[t]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.itemId`)} className={cellCls} />
                    </td>
                    <td className="px-2 py-1">
                      <input {...register(`lines.${i}.itemName`)} className={cellCls} />
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
                      <input {...register(`lines.${i}.note`)} className={cellCls} />
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
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {typeof formState.errors.lines?.message === 'string' && (
          <p className="text-sm text-red-600">{formState.errors.lines.message}</p>
        )}
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
            {!orderId && (
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
