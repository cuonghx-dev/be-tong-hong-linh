import { CHART_OF_ACCOUNTS, FixedAssetStatus, type CreateFixedAssetDisposalInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { cn } from '@/shared/lib/cn'
import { formatCurrency } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import { PlusIcon } from '@/shared/ui/icons'
import { useDisposal } from '../api/useDisposals'
import { useCreateDisposal, useUpdateDisposal } from '../api/useDisposalMutations'
import { useFixedAssets } from '../api/useFixedAssets'
import { disposalSchema, type DisposalFormValues, type DisposalLineFormValues } from '../schema'

interface Props {
  disposalId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

function emptyLine(): DisposalLineFormValues {
  return {
    originalCost: 0,
    accumulatedDepreciation: 0,
    residualValue: 0,
    debitAccount: CHART_OF_ACCOUNTS.FIXED_ASSET_DEPRECIATION,
    creditAccount: CHART_OF_ACCOUNTS.FIXED_ASSET,
  }
}

function defaultValues(): DisposalFormValues {
  return {
    postingDate: today(),
    voucherDate: today(),
    reason: 'Nhượng bán, thanh lý',
    lines: [emptyLine()],
  }
}

export function DisposalForm({ disposalId, readOnly = false, onSaved, onCancel }: Props) {
  const editing = useDisposal(disposalId ?? null)
  const create = useCreateDisposal()
  const update = useUpdateDisposal()

  // Danh sách thẻ TSCD để chọn ghi giảm (chỉ tài sản đang sử dụng).
  const assets = useFixedAssets({ page: 1, pageSize: 200, status: FixedAssetStatus.InUse })
  const assetOptions = assets.data?.data ?? []
  const assetById = useMemo(
    () => new Map(assetOptions.map((a) => [a.id, a])),
    [assetOptions],
  )

  const form = useForm<DisposalFormValues>({
    resolver: zodResolver(disposalSchema),
    defaultValues: defaultValues(),
  })
  const { control, register, handleSubmit, reset, watch, setValue, formState } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  // Nạp dữ liệu khi xem/sửa.
  useEffect(() => {
    const v = editing.data
    if (!v) return
    reset({
      postingDate: v.postingDate.slice(0, 10),
      voucherDate: v.voucherDate.slice(0, 10),
      reason: v.reason ?? undefined,
      lines: v.lines.map((l) => ({
        assetId: l.assetId ?? undefined,
        assetCode: l.assetCode ?? undefined,
        assetName: l.assetName ?? undefined,
        originalCost: Number(l.originalCost),
        accumulatedDepreciation: Number(l.accumulatedDepreciation),
        residualValue: Number(l.residualValue),
        debitAccount: l.debitAccount ?? undefined,
        creditAccount: l.creditAccount ?? undefined,
      })),
    })
  }, [editing.data, reset])

  const lines = watch('lines')
  const totalResidual = lines?.reduce((s, l) => s + (l.residualValue || 0), 0) ?? 0
  const totalOriginal = lines?.reduce((s, l) => s + (l.originalCost || 0), 0) ?? 0

  // Chọn thẻ TSCD → tự điền mã/tên/giá trị + TK định khoản (Có = TK nguyên giá của thẻ).
  const onPickAsset = (i: number, assetId: string) => {
    setValue(`lines.${i}.assetId`, assetId)
    const a = assetById.get(assetId)
    if (!a) return
    setValue(`lines.${i}.assetCode`, a.code)
    setValue(`lines.${i}.assetName`, a.name)
    setValue(`lines.${i}.originalCost`, Number(a.originalCost))
    setValue(`lines.${i}.accumulatedDepreciation`, Number(a.accumulatedDepreciation))
    setValue(`lines.${i}.residualValue`, Number(a.residualValue))
    setValue(
      `lines.${i}.creditAccount`,
      a.costAccount || CHART_OF_ACCOUNTS.FIXED_ASSET,
    )
  }

  const submit = (goNext: boolean) =>
    handleSubmit(async (values) => {
      const dto: CreateFixedAssetDisposalInput = {
        postingDate: values.postingDate,
        voucherDate: values.voucherDate,
        reason: values.reason,
        lines: values.lines.map((l) => ({
          assetId: l.assetId,
          assetCode: l.assetCode,
          assetName: l.assetName,
          originalCost: l.originalCost,
          accumulatedDepreciation: l.accumulatedDepreciation,
          residualValue: l.residualValue,
          debitAccount: l.debitAccount,
          creditAccount: l.creditAccount,
        })),
      }
      if (disposalId) await update.mutateAsync({ id: disposalId, dto })
      else await create.mutateAsync(dto)
      if (goNext && !disposalId) reset(defaultValues())
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
          <Field label="Lý do ghi giảm" error={formState.errors.reason?.message}>
            <input {...register('reason')} className={inputCls} />
          </Field>
          <Field label="Số chứng từ">
            <input
              value={editing.data?.voucherNo ?? 'Tự động'}
              readOnly
              className={cn(inputCls, 'bg-slate-50 text-slate-500')}
            />
          </Field>
          <Field label="Ngày hạch toán" error={formState.errors.postingDate?.message}>
            <input type="date" {...register('postingDate')} className={inputCls} />
          </Field>
          <Field label="Ngày chứng từ" error={formState.errors.voucherDate?.message}>
            <input type="date" {...register('voucherDate')} className={inputCls} />
          </Field>
        </div>

        {/* Bảng tài sản ghi giảm */}
        <div className="rounded-md border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-slate-50 px-2 py-1.5">
            <span className="text-sm font-medium text-slate-600">Tài sản ghi giảm</span>
            <Button type="button" variant="outline" size="sm" onClick={() => append(emptyLine())}>
              <PlusIcon size={14} /> Thêm dòng
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-8 px-2 py-1.5 text-center">#</th>
                  <th className="px-2 py-1.5">Tài sản</th>
                  <th className="w-32 px-2 py-1.5 text-right">Nguyên giá</th>
                  <th className="w-32 px-2 py-1.5 text-right">Hao mòn lũy kế</th>
                  <th className="w-32 px-2 py-1.5 text-right">Giá trị còn lại</th>
                  <th className="w-20 px-2 py-1.5">TK Nợ</th>
                  <th className="w-20 px-2 py-1.5">TK Có</th>
                  <th className="w-8 px-2 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {fields.map((f, i) => {
                  const l = lines?.[i]
                  return (
                    <tr key={f.id} className="border-t border-border">
                      <td className="px-2 py-1 text-center text-slate-400">{i + 1}</td>
                      <td className="px-2 py-1">
                        <select
                          value={l?.assetId ?? ''}
                          onChange={(e) => onPickAsset(i, e.target.value)}
                          disabled={readOnly}
                          className={cellCls}
                        >
                          <option value="">— Chọn tài sản —</option>
                          {/* Giữ lại thẻ đang chọn dù đã ghi giảm (không còn trong danh sách IN_USE). */}
                          {l?.assetId && !assetById.has(l.assetId) && (
                            <option value={l.assetId}>
                              {l.assetCode} — {l.assetName}
                            </option>
                          )}
                          {assetOptions.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} — {a.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums text-slate-700">
                        {formatCurrency(l?.originalCost || 0)}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums text-slate-700">
                        {formatCurrency(l?.accumulatedDepreciation || 0)}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums text-slate-700">
                        {formatCurrency(l?.residualValue || 0)}
                      </td>
                      <td className="px-2 py-1">
                        <input {...register(`lines.${i}.debitAccount`)} className={cellCls} />
                      </td>
                      <td className="px-2 py-1">
                        <input {...register(`lines.${i}.creditAccount`)} className={cellCls} />
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
                  <td className="px-2 py-1.5" colSpan={2}>
                    Tổng cộng
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatCurrency(totalOriginal)}
                  </td>
                  <td />
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatCurrency(totalResidual)}
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
            {!disposalId && (
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
