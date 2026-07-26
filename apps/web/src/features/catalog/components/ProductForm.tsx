import type { CreateProductInput } from '@app/shared'
import { PRODUCT_TYPE_LABELS, ProductType } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { AccountPicker } from '@/shared/ui/account-picker'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useProductGroups } from '../api/useProductGroups'
import { useProduct } from '../api/useProducts'
import { useCreateProduct, useUpdateProduct } from '../api/useProductMutations'
import { useUnits } from '../api/useUnits'
import { useWarehouses } from '../api/useWarehouses'
import { productSchema, type ProductFormValues } from '../schema'

interface Props {
  productId?: string | null
  // Nhân bản: điền sẵn dữ liệu từ VTHH nguồn, để trống mã (mã phải duy nhất), Lưu tạo bản ghi mới.
  duplicateFromId?: string | null
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

// Thuế suất GTGT theo MISA: số % hoặc mã đặc biệt (KCT/KKKNT/KHAC).
const VAT_RATE_OPTIONS = [
  { value: '0', label: '0%' },
  { value: '5', label: '5%' },
  { value: '8', label: '8%' },
  { value: '10', label: '10%' },
  { value: 'KCT', label: 'KCT (Không chịu thuế)' },
  { value: 'KKKNT', label: 'KKKNT (Không kê khai, nộp thuế)' },
]

export function ProductForm({
  productId,
  duplicateFromId,
  readOnly = false,
  onSaved,
  onCancel,
}: Props) {
  const duplicating = !productId && !!duplicateFromId
  const editing = useProduct(productId ?? duplicateFromId ?? null)
  const create = useCreateProduct()
  const update = useUpdateProduct()
  // Nguồn cho combobox nhóm VTHH / ĐVT / kho ngầm định (chỉ bản ghi đang sử dụng).
  const productGroups = useProductGroups({ page: 1, pageSize: 200, isActive: true })
  const units = useUnits({ page: 1, pageSize: 200, isActive: true })
  const warehouses = useWarehouses({ page: 1, pageSize: 200, isActive: true })

  const { control, register, handleSubmit, reset, watch, setValue, formState } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    const p = editing.data
    if (!p) return
    reset({
      // Nhân bản → mã để trống cho người dùng tự nhập (mã duy nhất).
      code: duplicating ? '' : p.code,
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
      taxReduction: p.taxReduction ?? undefined,
      isActive: p.isActive,
    })
  }, [editing.data, reset, duplicating])

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
      taxReduction: clean(values.taxReduction),
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
            <PickSelect
              value={watch('groupCode')}
              onChange={(v) => setValue('groupCode', v)}
              placeholder="Chọn nhóm VTHH"
              options={(productGroups.data?.data ?? []).map((g) => ({
                value: g.code,
                label: `${g.code} - ${g.name}`,
              }))}
            />
          </Field>
          <Field label="Đơn vị tính chính">
            <PickSelect
              value={watch('unit')}
              onChange={(v) => setValue('unit', v)}
              placeholder="Chọn đơn vị tính"
              options={(units.data?.data ?? []).map((u) => ({ value: u.name, label: u.name }))}
            />
          </Field>
          <Field label="Thuế suất GTGT">
            <PickSelect
              value={watch('vatRate')}
              onChange={(v) => setValue('vatRate', v)}
              placeholder="Chọn thuế suất"
              options={VAT_RATE_OPTIONS}
            />
          </Field>
          <Field label="Giảm thuế theo quy định">
            <input
              {...register('taxReduction')}
              placeholder="Chưa xác định"
              className={inputCls}
            />
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
          {/* Chọn 1 kho → điền cả mã và tên kho ngầm định. */}
          <Field label="Kho ngầm định">
            <PickSelect
              value={watch('defaultWarehouseCode')}
              onChange={(v) => {
                setValue('defaultWarehouseCode', v)
                const w = warehouses.data?.data.find((x) => x.code === v)
                setValue('defaultWarehouseName', w?.name ?? '')
              }}
              placeholder="Chọn kho"
              options={(warehouses.data?.data ?? []).map((w) => ({
                value: w.code,
                label: `${w.code} - ${w.name}`,
              }))}
            />
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
            <Controller
              control={control}
              name="inventoryAccount"
              render={({ field }) => (
                <AccountPicker
                  value={field.value}
                  onChange={field.onChange}
                  inputClassName={inputCls}
                />
              )}
            />
          </Field>
          <Field label="TK Doanh thu">
            <Controller
              control={control}
              name="revenueAccount"
              render={({ field }) => (
                <AccountPicker
                  value={field.value}
                  onChange={field.onChange}
                  inputClassName={inputCls}
                />
              )}
            />
          </Field>
          <Field label="TK chiết khấu">
            <Controller
              control={control}
              name="discountAccount"
              render={({ field }) => (
                <AccountPicker
                  value={field.value}
                  onChange={field.onChange}
                  inputClassName={inputCls}
                />
              )}
            />
          </Field>
          <Field label="TK Trả lại">
            <Controller
              control={control}
              name="saleReturnAccount"
              render={({ field }) => (
                <AccountPicker
                  value={field.value}
                  onChange={field.onChange}
                  inputClassName={inputCls}
                />
              )}
            />
          </Field>
          <Field label="TK chi phí">
            <Controller
              control={control}
              name="costAccount"
              render={({ field }) => (
                <AccountPicker
                  value={field.value}
                  onChange={field.onChange}
                  inputClassName={inputCls}
                />
              )}
            />
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
              {saving ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </>
        )}
      </div>
    </form>
  )
}

const inputCls =
  'h-9 w-full rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

// Combobox chọn 1 giá trị text từ danh mục; '' = bỏ trống.
// Giá trị cũ không còn trong danh mục (ngừng sử dụng / nhập khẩu) vẫn hiển thị được.
const NONE = '__none'

function PickSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value?: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  const legacy = value && !options.some((o) => o.value === value) ? value : null
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{placeholder}</SelectItem>
        {legacy && <SelectItem value={legacy}>{legacy}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

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
