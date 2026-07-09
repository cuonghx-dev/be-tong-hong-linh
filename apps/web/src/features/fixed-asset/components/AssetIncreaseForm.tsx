import { CHART_OF_ACCOUNTS, FixedAssetStatus, type CreateFixedAssetInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { cn } from '@/shared/lib/cn'
import { formatCurrency } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import { useFixedAsset } from '../api/useFixedAssets'
import { useCreateFixedAsset, useUpdateFixedAsset } from '../api/useFixedAssetMutations'
import { assetIncreaseSchema, type AssetIncreaseFormValues } from '../schema'
import { ASSET_TYPE_OPTIONS, FIXED_ASSET_STATUS_LABEL } from '../types'

interface Props {
  assetId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

function defaultValues(): AssetIncreaseFormValues {
  return {
    code: '',
    name: '',
    increaseDate: today(),
    depreciationStartDate: today(),
    usefulLifeMonths: 0,
    originalCost: 0,
    depreciableValue: 0,
    accumulatedDepreciation: 0,
    costAccount: CHART_OF_ACCOUNTS.FIXED_ASSET,
    depreciationAccount: CHART_OF_ACCOUNTS.FIXED_ASSET_DEPRECIATION,
    status: FixedAssetStatus.InUse,
    attachmentCount: 0,
  }
}

export function AssetIncreaseForm({ assetId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useFixedAsset(assetId ?? null)
  const create = useCreateFixedAsset()
  const update = useUpdateFixedAsset()

  const form = useForm<AssetIncreaseFormValues>({
    resolver: zodResolver(assetIncreaseSchema),
    defaultValues: defaultValues(),
  })
  const { register, handleSubmit, reset, watch, formState } = form

  // Nạp dữ liệu khi xem/sửa.
  useEffect(() => {
    const v = editing.data
    if (!v) return
    reset({
      code: v.code,
      name: v.name,
      assetType: v.assetType ?? undefined,
      department: v.department ?? undefined,
      description: v.description ?? undefined,
      attachmentCount: v.attachmentCount,
      increaseDate: v.increaseDate?.slice(0, 10) ?? today(),
      depreciationStartDate: v.depreciationStartDate?.slice(0, 10) ?? undefined,
      usefulLifeMonths: v.usefulLifeMonths,
      originalCost: Number(v.originalCost),
      depreciableValue: Number(v.depreciableValue),
      accumulatedDepreciation: Number(v.accumulatedDepreciation),
      costAccount: v.costAccount ?? undefined,
      depreciationAccount: v.depreciationAccount ?? undefined,
      status: v.status,
    })
  }, [editing.data, reset])

  // Xem trước giá trị dẫn xuất (server tính lại khi cất).
  const originalCost = watch('originalCost') || 0
  const depreciableValue = watch('depreciableValue') || 0
  const accumulated = watch('accumulatedDepreciation') || 0
  const useful = watch('usefulLifeMonths') || 0
  const residualValue = originalCost - accumulated
  const monthlyDepreciation = useful > 0 ? Math.round(depreciableValue / useful) : 0

  const submit = (goNext: boolean) =>
    handleSubmit(async (values) => {
      const dto: CreateFixedAssetInput = {
        code: values.code,
        name: values.name,
        assetType: values.assetType,
        department: values.department,
        description: values.description,
        attachmentCount: values.attachmentCount,
        increaseDate: values.increaseDate,
        depreciationStartDate: values.depreciationStartDate || undefined,
        usefulLifeMonths: values.usefulLifeMonths,
        originalCost: values.originalCost,
        depreciableValue: values.depreciableValue,
        accumulatedDepreciation: values.accumulatedDepreciation,
        costAccount: values.costAccount,
        depreciationAccount: values.depreciationAccount,
        status: values.status,
      }
      if (assetId) {
        // Không đổi mã tài sản khi sửa (khóa nghiệp vụ).
        const { code: _code, ...rest } = dto
        await update.mutateAsync({ id: assetId, dto: rest })
      } else {
        await create.mutateAsync(dto)
      }
      if (goNext && !assetId) reset(defaultValues())
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
          <Field label="Mã tài sản" error={formState.errors.code?.message}>
            <input
              {...register('code')}
              disabled={readOnly || !!assetId}
              className={cn(inputCls, assetId && 'bg-slate-50 text-slate-500')}
            />
          </Field>
          <Field label="Tên tài sản" error={formState.errors.name?.message}>
            <input {...register('name')} className={inputCls} />
          </Field>
          <Field label="Loại tài sản">
            <input list="asset-type-options" {...register('assetType')} className={inputCls} />
            <datalist id="asset-type-options">
              {ASSET_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          <Field label="Đơn vị sử dụng">
            <input {...register('department')} className={inputCls} />
          </Field>
          <Field label="Số chứng từ">
            <input
              value={editing.data?.voucherNo ?? 'Tự động'}
              readOnly
              className={cn(inputCls, 'bg-slate-50 text-slate-500')}
            />
          </Field>
          <Field label="Tình trạng sử dụng">
            <select {...register('status')} className={inputCls}>
              {Object.values(FixedAssetStatus).map((s) => (
                <option key={s} value={s}>
                  {FIXED_ASSET_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ngày ghi tăng" error={formState.errors.increaseDate?.message}>
            <input type="date" {...register('increaseDate')} className={inputCls} />
          </Field>
          <Field label="Ngày bắt đầu tính KH">
            <input type="date" {...register('depreciationStartDate')} className={inputCls} />
          </Field>
          <Field label="Diễn giải">
            <input {...register('description')} className={inputCls} />
          </Field>
          <Field label="Kèm theo (chứng từ gốc)">
            <input type="number" min={0} {...register('attachmentCount')} className={inputCls} />
          </Field>
        </div>

        {/* Nguyên giá & khấu hao */}
        <div className="rounded-md border border-border">
          <div className="border-b border-border bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600">
            Nguyên giá & khấu hao
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 p-3 md:grid-cols-2">
            <Field label="Nguyên giá" error={formState.errors.originalCost?.message}>
              <input
                type="number"
                min={0}
                step="any"
                {...register('originalCost')}
                className={cn(inputCls, 'text-right tabular-nums')}
              />
            </Field>
            <Field label="Giá trị tính KH">
              <input
                type="number"
                min={0}
                step="any"
                {...register('depreciableValue')}
                className={cn(inputCls, 'text-right tabular-nums')}
              />
            </Field>
            <Field label="Hao mòn lũy kế">
              <input
                type="number"
                min={0}
                step="any"
                {...register('accumulatedDepreciation')}
                className={cn(inputCls, 'text-right tabular-nums')}
              />
            </Field>
            <Field label="Thời gian sử dụng (tháng)" error={formState.errors.usefulLifeMonths?.message}>
              <input
                type="number"
                min={0}
                {...register('usefulLifeMonths')}
                className={cn(inputCls, 'text-right tabular-nums')}
              />
            </Field>
            <ReadOnlyMoney label="Giá trị còn lại" value={residualValue} />
            <ReadOnlyMoney label="Giá trị KH tháng" value={monthlyDepreciation} />
            <Field label="TK nguyên giá">
              <input {...register('costAccount')} className={inputCls} />
            </Field>
            <Field label="TK khấu hao">
              <input {...register('depreciationAccount')} className={inputCls} />
            </Field>
          </div>
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
            {!assetId && (
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

// Ô hiển thị giá trị dẫn xuất (không nhập tay — server tính).
function ReadOnlyMoney({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <div className="flex h-9 items-center justify-end rounded-md border border-dashed border-border bg-slate-50 px-2 text-sm tabular-nums text-slate-600">
        {formatCurrency(value)}
      </div>
    </div>
  )
}
