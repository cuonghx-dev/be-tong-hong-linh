import { ItemNature, ItemTaxReduction, type CreateInventoryItemInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/shared/ui/button'
import { useItem } from '../api/useItems'
import { useCreateItem, useUpdateItem } from '../api/useItemMutations'
import { itemSchema, type ItemFormValues } from '../schema'
import { ITEM_NATURE_LABEL, ITEM_TAX_REDUCTION_LABEL } from '../types'

interface Props {
  itemId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: ItemFormValues = {
  code: '',
  name: '',
  nature: ItemNature.Goods,
  taxReduction: ItemTaxReduction.Undetermined,
  priceAfterTax: false,
  isActive: true,
}

export function ItemForm({ itemId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useItem(itemId ?? null)
  const create = useCreateItem()
  const update = useUpdateItem()

  const { register, handleSubmit, reset, formState } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    const i = editing.data
    if (!i) return
    reset({
      code: i.code,
      name: i.name,
      nature: i.nature,
      taxReduction: i.taxReduction,
      groupName: i.groupName ?? undefined,
      unit: i.unit ?? undefined,
      minStock: Number(i.minStock),
      warrantyMonths: i.warrantyMonths ?? undefined,
      origin: i.origin ?? undefined,
      description: i.description ?? undefined,
      purchaseDescription: i.purchaseDescription ?? undefined,
      salesDescription: i.salesDescription ?? undefined,
      defaultWarehouse: i.defaultWarehouse ?? undefined,
      stockAccount: i.stockAccount ?? undefined,
      revenueAccount: i.revenueAccount ?? undefined,
      expenseAccount: i.expenseAccount ?? undefined,
      purchasePrice: Number(i.purchasePrice),
      salePrice: Number(i.salePrice),
      vatRate: Number(i.vatRate),
      priceAfterTax: i.priceAfterTax,
      branchName: i.branchName ?? undefined,
      isActive: i.isActive,
    })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreateInventoryItemInput = values
    if (itemId) await update.mutateAsync({ id: itemId, dto })
    else await create.mutateAsync(dto)
    onSaved()
  })

  const saving = create.isPending || update.isPending
  const error = (create.error ?? update.error) as { response?: { data?: { message?: string } } } | null
  const serverMsg = error?.response?.data?.message

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-90">
        <div className="flex flex-wrap gap-4">
          {Object.values(ItemNature).map((n) => (
            <label key={n} className="flex items-center gap-1.5 text-sm">
              <input type="radio" value={n} {...register('nature')} />
              {ITEM_NATURE_LABEL[n]}
            </label>
          ))}
          <label className="ml-auto flex items-center gap-1.5 text-sm">
            <input type="checkbox" {...register('isActive')} />
            Đang sử dụng
          </label>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          <Field label="Mã hàng hóa" required error={formState.errors.code?.message}>
            <input {...register('code')} className={inputCls} />
          </Field>
          <Field label="Tên hàng hóa" required error={formState.errors.name?.message}>
            <input {...register('name')} className={inputCls} />
          </Field>
          <Field label="Giảm thuế theo quy định">
            <select {...register('taxReduction')} className={inputCls}>
              {Object.values(ItemTaxReduction).map((t) => (
                <option key={t} value={t}>
                  {ITEM_TAX_REDUCTION_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nhóm VTHH">
            <input {...register('groupName')} className={inputCls} />
          </Field>
          <Field label="Đơn vị tính chính">
            <input {...register('unit')} className={inputCls} />
          </Field>
          <Field label="Số lượng tồn tối thiểu">
            <input type="number" step="any" {...register('minStock')} className={inputCls} />
          </Field>
          <Field label="Thời hạn bảo hành (tháng)">
            <input type="number" {...register('warrantyMonths')} className={inputCls} />
          </Field>
          <Field label="Nguồn gốc">
            <input {...register('origin')} className={inputCls} />
          </Field>
          <Field label="Kho ngầm định">
            <input {...register('defaultWarehouse')} className={inputCls} />
          </Field>
          <Field label="Chi nhánh">
            <input {...register('branchName')} className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
          <Field label="TK Kho">
            <input {...register('stockAccount')} className={inputCls} />
          </Field>
          <Field label="TK Doanh thu">
            <input {...register('revenueAccount')} className={inputCls} />
          </Field>
          <Field label="TK chi phí">
            <input {...register('expenseAccount')} className={inputCls} />
          </Field>
          <Field label="Đơn giá mua gần nhất">
            <input type="number" step="any" {...register('purchasePrice')} className={inputCls} />
          </Field>
          <Field label="Đơn giá bán 1">
            <input type="number" step="any" {...register('salePrice')} className={inputCls} />
          </Field>
          <Field label="Thuế suất GTGT (%)">
            <input type="number" step="any" {...register('vatRate')} className={inputCls} />
          </Field>
        </div>

        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" {...register('priceAfterTax')} />
          Là đơn giá sau thuế
        </label>

        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          <Field label="Diễn giải khi mua">
            <input {...register('purchaseDescription')} className={inputCls} />
          </Field>
          <Field label="Diễn giải khi bán">
            <input {...register('salesDescription')} className={inputCls} />
          </Field>
        </div>
        <Field label="Mô tả">
          <textarea {...register('description')} rows={2} className={`${inputCls} h-auto py-1.5`} />
        </Field>

        {serverMsg && <p className="text-sm text-red-600">{String(serverMsg)}</p>}
      </fieldset>

      <div className="flex justify-end gap-2">
        {readOnly ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Đóng
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Đang cất…' : 'Cất'}
            </Button>
          </>
        )}
      </div>
    </form>
  )
}

const inputCls =
  'h-9 w-full rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
