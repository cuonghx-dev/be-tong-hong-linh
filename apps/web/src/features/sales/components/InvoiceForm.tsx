import { InvoiceIssueStatus, type CreateInvoiceInput } from '@app/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { useCreateInvoice, useInvoice } from '../api/useInvoices'
import { invoiceSchema, type InvoiceFormValues } from '../schema'
import { ISSUE_STATUS_LABEL } from '../types'
import { AmountInput } from './AmountInput'

interface InvoiceFormProps {
  invoiceId?: string | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

const INVOICE_TYPES = ['Hóa đơn GTGT', 'Hóa đơn bán hàng', 'Hóa đơn từ máy tính tiền']
const PAYMENT_FORMS = ['TM/CK', 'CK', 'TM']

function defaultValues(): InvoiceFormValues {
  return {
    invoiceType: INVOICE_TYPES[0],
    invoiceDate: today(),
    paymentForm: PAYMENT_FORMS[0],
    totalAmount: 0,
  }
}

export function InvoiceForm({ invoiceId, readOnly = false, onSaved, onCancel }: InvoiceFormProps) {
  const editing = useInvoice(invoiceId ?? null)
  const create = useCreateInvoice()

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: defaultValues(),
  })
  const { control, register, handleSubmit, reset, formState } = form

  useEffect(() => {
    const v = editing.data
    if (!v) return
    reset({
      invoiceType: v.invoiceType ?? INVOICE_TYPES[0],
      invoiceDate: v.invoiceDate.slice(0, 10),
      customerId: v.customerId ?? undefined,
      customerName: v.customerName ?? undefined,
      paymentForm: v.paymentForm ?? undefined,
      bankAccount: v.bankAccount ?? undefined,
      symbol: v.symbol ?? undefined,
      templateNo: v.templateNo ?? undefined,
      totalAmount: Number(v.totalAmount),
    })
  }, [editing.data, reset])

  const submit = (goNext: boolean) =>
    handleSubmit(async (values) => {
      const dto: CreateInvoiceInput = { ...values }
      await create.mutateAsync(dto)
      if (goNext && !invoiceId) reset(defaultValues())
      else onSaved()
    })

  const saving = create.isPending
  const issued = editing.data?.issueStatus === InvoiceIssueStatus.CodeIssued

  return (
    <form className="space-y-4">
      <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-90">
        {editing.data && (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded px-2 py-1 text-xs font-medium',
                issued ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
              )}
            >
              {ISSUE_STATUS_LABEL[editing.data.issueStatus]}
            </span>
            {editing.data.taxAuthorityCode && (
              <span className="text-xs text-slate-500">
                Mã CQT: {editing.data.taxAuthorityCode}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          <Field label="Loại hóa đơn">
            <select {...register('invoiceType')} className={inputCls}>
              {INVOICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Số hóa đơn">
            <input
              value={editing.data?.invoiceNo ?? 'Cấp khi phát hành'}
              readOnly
              className={cn(inputCls, 'bg-slate-50 text-slate-500')}
            />
          </Field>
          <Field label="Mã khách hàng">
            <input {...register('customerId')} className={inputCls} placeholder="Mã KH" />
          </Field>
          <Field label="Tên khách hàng">
            <input {...register('customerName')} className={inputCls} />
          </Field>
          <Field label="Ngày hóa đơn" error={formState.errors.invoiceDate?.message}>
            <input type="date" {...register('invoiceDate')} className={inputCls} />
          </Field>
          <Field label="Hình thức thanh toán">
            <select {...register('paymentForm')} className={inputCls}>
              {PAYMENT_FORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mẫu số">
            <input {...register('templateNo')} className={inputCls} placeholder="vd 1" />
          </Field>
          <Field label="Ký hiệu">
            <input {...register('symbol')} className={inputCls} placeholder="vd 1C26MYY" />
          </Field>
          <Field label="Giá trị hóa đơn" error={formState.errors.totalAmount?.message}>
            <Controller
              control={control}
              name="totalAmount"
              render={({ field }) => <AmountInput value={field.value} onChange={field.onChange} />}
            />
          </Field>
        </div>
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
            <Button type="button" onClick={submit(false)} disabled={saving}>
              {saving ? 'Đang cất…' : 'Cất'}
            </Button>
            {!invoiceId && (
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
