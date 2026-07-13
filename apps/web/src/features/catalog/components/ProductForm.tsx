import type { CreateProductInput } from '@app/shared'
import { PRODUCT_TYPE_LABELS, ProductType } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useProduct } from '../api/useProducts'
import { useCreateProduct, useUpdateProduct } from '../api/useProductMutations'
import { productSchema, type ProductFormValues } from '../schema'

interface Props {
  productId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const DEFAULTS: ProductFormValues = {
  code: '',
  name: '',
  type: ProductType.Goods,
  isActive: true,
}

// '' → undefined để bỏ giá trị rỗng khi gửi (Decimal / cột optional).
const clean = (v?: string) => (v && v.trim() !== '' ? v : undefined)

export function ProductForm({ productId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useProduct(productId ?? null)
  const create = useCreateProduct()
  const update = useUpdateProduct()

  const { register, handleSubmit, reset, watch, setValue, formState } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    const p = editing.data
    if (!p) return
    reset({
      code: p.code,
      name: p.name,
      type: p.type,
      groupCode: p.groupCode ?? undefined,
      unit: p.unit ?? undefined,
      description: p.description ?? undefined,
      purchaseDescription: p.purchaseDescription ?? undefined,
      saleDescription: p.saleDescription ?? undefined,
      defaultWarehouseCode: p.defaultWarehouseCode ?? undefined,
      defaultWarehouseName: p.defaultWarehouseName ?? undefined,
      inventoryAccount: p.inventoryAccount ?? undefined,
      revenueAccount: p.revenueAccount ?? undefined,
      discountAccount: p.discountAccount ?? undefined,
      saleReturnAccount: p.saleReturnAccount ?? undefined,
      costAccount: p.costAccount ?? undefined,
      purchasePrice: p.purchasePrice ?? undefined,
      salePrice: p.salePrice ?? undefined,
      minStock: p.minStock ?? undefined,
      vatRate: p.vatRate ?? undefined,
      isActive: p.isActive,
    })
  }, [editing.data, reset])

  const submit = handleSubmit(async (values) => {
    const dto: CreateProductInput = {
      code: values.code,
      name: values.name,
      type: values.type,
      groupCode: clean(values.groupCode),
      unit: clean(values.unit),
      description: clean(values.description),
      purchaseDescription: clean(values.purchaseDescription),
      saleDescription: clean(values.saleDescription),
      defaultWarehouseCode: clean(values.defaultWarehouseCode),
      defaultWarehouseName: clean(values.defaultWarehouseName),
      inventoryAccount: clean(values.inventoryAccount),
      revenueAccount: clean(values.revenueAccount),
      discountAccount: clean(values.discountAccount),
      saleReturnAccount: clean(values.saleReturnAccount),
      costAccount: clean(values.costAccount),
      purchasePrice: clean(values.purchasePrice),
      salePrice: clean(values.salePrice),
      minStock: clean(values.minStock),
      vatRate: clean(values.vatRate),
      isActive: values.isActive,
    }
    if (productId) await update.mutateAsync({ id: productId, dto })
    else await create.mutateAsync(dto)
    onSaved()
  })

  const saving = create.isPending || update.isPending
  const error = (create.error ?? update.error) as
    | { response?: { data?: { message?: string } } }
    | null
  const serverMsg = error?.response?.data?.message

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={readOnly} className="space-y-5 disabled:opacity-90">
        {/* Thông tin chung */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          <Field label="Mã hàng hóa" required error={formState.errors.code?.message}>
            <input {...register('code')} className={inputCls} />
          </Field>
          <Field label="Tên hàng hóa" required error={formState.errors.name?.message}>
            <input {...register('name')} className={inputCls} />
          </Field>
          <Field label="Tính chất" error={formState.errors.type?.message}>
            <Select
              value={watch('type')}
              onValueChange={(v) => setValue('type', v as ProductType)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ProductType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {PRODUCT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nhóm VTHH">
            <input {...register('groupCode')} className={inputCls} />
          </Field>
          <Field label="Đơn vị tính chính">
            <input {...register('unit')} className={inputCls} />
          </Field>
          <Field label="Thuế suất GTGT">
            <input {...register('vatRate')} placeholder="10 / 8 / KCT" className={inputCls} />
          </Field>
          <Field label="Mô tả">
            <input {...register('description')} className={inputCls} />
          </Field>
          <Field label="Số lượng tồn tối thiểu" error={formState.errors.minStock?.message}>
            <input {...register('minStock')} inputMode="decimal" className={inputCls} />
          </Field>
        </div>

        {/* Kho + đơn giá */}
        <Section title="Kho & đơn giá ngầm định">
          <Field label="Mã kho ngầm định">
            <input {...register('defaultWarehouseCode')} className={inputCls} />
          </Field>
          <Field label="Kho ngầm định">
            <input {...register('defaultWarehouseName')} className={inputCls} />
          </Field>
          <Field label="Đơn giá mua gần nhất" error={formState.errors.purchasePrice?.message}>
            <input {...register('purchasePrice')} inputMode="decimal" className={inputCls} />
          </Field>
          <Field label="Đơn giá bán" error={formState.errors.salePrice?.message}>
            <input {...register('salePrice')} inputMode="decimal" className={inputCls} />
          </Field>
        </Section>

        {/* Tài khoản ngầm định */}
        <Section title="Tài khoản ngầm định">
          <Field label="TK Kho">
            <input {...register('inventoryAccount')} className={inputCls} />
          </Field>
          <Field label="TK Doanh thu">
            <input {...register('revenueAccount')} className={inputCls} />
          </Field>
          <Field label="TK chiết khấu">
            <input {...register('discountAccount')} className={inputCls} />
          </Field>
          <Field label="TK Trả lại">
            <input {...register('saleReturnAccount')} className={inputCls} />
          </Field>
          <Field label="TK chi phí">
            <input {...register('costAccount')} className={inputCls} />
          </Field>
        </Section>

        {/* Diễn giải mua/bán */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          <Field label="Diễn giải khi mua">
            <input {...register('purchaseDescription')} className={inputCls} />
          </Field>
          <Field label="Diễn giải khi bán">
            <input {...register('saleDescription')} className={inputCls} />
          </Field>
        </div>

        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" {...register('isActive')} />
          Đang sử dụng
        </label>

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">{children}</div>
    </div>
  )
}

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
