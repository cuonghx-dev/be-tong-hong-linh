import { PaymentMethod } from '@app/shared'
import { useEffect, useMemo, useState } from 'react'
import { useBankAccounts } from '@/features/catalog'
import { getApiErrorMessage } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { useToast } from '@/shared/ui/toast'
import { useCollectPayment, useOpenReceivables } from '../api/useReceivables'
import { PAYMENT_METHOD_LABEL } from '../types'
import { AmountInput } from './AmountInput'

interface CollectPaymentDialogProps {
  // Khách hàng cần thu tiền; null = đóng dialog.
  customer: { id: string; name: string } | null
  onClose: () => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// Thu tiền khách hàng theo hóa đơn (MISA: Thu tiền khách hàng): liệt kê chứng từ
// bán hàng còn phải thu, tick + nhập số thu từng chứng từ → sinh phiếu thu (TM)
// hoặc thu tiền gửi (CK) hạch toán Có 131 kèm đối trừ.
export function CollectPaymentDialog({ customer, onClose }: CollectPaymentDialogProps) {
  const open = useOpenReceivables(customer?.id)
  const collect = useCollectPayment()
  const { toast } = useToast()

  const [amounts, setAmounts] = useState<Record<string, number>>({})
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.Cash)
  const [bankAccountNo, setBankAccountNo] = useState('')
  const [bankName, setBankName] = useState('')
  const [postingDate, setPostingDate] = useState(today())

  const bankAccounts = useBankAccounts({ page: 1, pageSize: 100 })

  // Mở cho KH khác → reset lựa chọn.
  useEffect(() => {
    if (customer) {
      setAmounts({})
      setMethod(PaymentMethod.Cash)
      setBankAccountNo('')
      setBankName('')
      setPostingDate(today())
    }
  }, [customer])

  const rows = open.data ?? []
  const totalCollect = useMemo(
    () => Object.values(amounts).reduce((s, v) => s + (v || 0), 0),
    [amounts],
  )
  const overAllocated = rows.some((r) => (amounts[r.salesVoucherId] ?? 0) > Number(r.remainingAmount))
  const needBank = method === PaymentMethod.BankTransfer
  const canSave =
    totalCollect > 0 && !overAllocated && (!needBank || !!bankAccountNo) && !collect.isPending

  const toggle = (id: string, remaining: number) =>
    setAmounts((prev) => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = remaining
      return next
    })

  const save = async () => {
    if (!customer || !canSave) return
    try {
      const result = await collect.mutateAsync({
        customerId: customer.id,
        postingDate,
        voucherDate: postingDate,
        paymentMethod: method,
        bankAccountNo: needBank ? bankAccountNo : undefined,
        bankName: needBank ? bankName : undefined,
        allocations: Object.entries(amounts)
          .filter(([, v]) => v > 0)
          .map(([salesVoucherId, amount]) => ({ salesVoucherId, amount })),
      })
      toast({
        variant: 'success',
        title: 'Đã thu tiền khách hàng',
        description: `Chứng từ ${result.voucherNo} — ${formatCurrency(Number(result.totalAmount))} đ.`,
      })
      onClose()
    } catch (e) {
      toast({ variant: 'error', title: 'Thu tiền thất bại', description: getApiErrorMessage(e) })
    }
  }

  return (
    <Modal
      open={!!customer}
      onClose={onClose}
      title={`Thu tiền khách hàng — ${customer?.name ?? ''}`}
      size="xl"
      footer={
        <>
          <div className="mr-auto text-sm text-slate-600">
            Tổng thu: <b className="tabular-nums text-slate-800">{formatCurrency(totalCollect)}</b> đ
          </div>
          <Button variant="outline" onClick={onClose} disabled={collect.isPending}>
            Hủy
          </Button>
          <Button onClick={save} disabled={!canSave}>
            {collect.isPending ? 'Đang lưu…' : 'Thu tiền'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Ngày thu</label>
            <input
              type="date"
              value={postingDate}
              onChange={(e) => setPostingDate(e.target.value)}
              className="h-8 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Hình thức thu</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="h-8 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {Object.values(PaymentMethod).map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
          {needBank && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">TK ngân hàng nhận</label>
              <select
                value={bankAccountNo}
                onChange={(e) => {
                  const no = e.target.value
                  const acc = bankAccounts.data?.data.find((a) => a.accountNumber === no)
                  setBankAccountNo(no)
                  setBankName(acc?.bankName ?? '')
                }}
                className="h-8 min-w-[220px] rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">— Chọn tài khoản —</option>
                {(bankAccounts.data?.data ?? []).map((a) => (
                  <option key={a.accountNumber} value={a.accountNumber}>
                    {a.accountNumber} — {a.bankName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="max-h-[380px] overflow-auto rounded-md border border-border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-8 px-2 py-2" />
                <th className="px-3 py-2">Chứng&nbsp;từ</th>
                <th className="px-3 py-2">Ngày</th>
                <th className="px-3 py-2">Hạn&nbsp;TT</th>
                <th className="px-3 py-2 text-right">Còn phải&nbsp;thu</th>
                <th className="w-40 px-3 py-2 text-right">Số&nbsp;thu</th>
              </tr>
            </thead>
            <tbody>
              {open.isLoading && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    Đang tải…
                  </td>
                </tr>
              )}
              {!open.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    Khách hàng không còn chứng từ phải thu.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const remaining = Number(r.remainingAmount)
                const picked = amounts[r.salesVoucherId] !== undefined
                const over = (amounts[r.salesVoucherId] ?? 0) > remaining
                return (
                  <tr key={r.salesVoucherId} className="border-t border-border hover:bg-slate-50">
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={picked}
                        onChange={() => toggle(r.salesVoucherId, remaining)}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-slate-700">
                      {r.voucherNo}
                      {r.invoiceNo && (
                        <span className="block text-xs text-slate-400">HĐ {r.invoiceNo}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                      {formatDate(r.postingDate)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                      {r.dueDate ? formatDate(r.dueDate) : ''}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">
                      {formatCurrency(remaining)}
                    </td>
                    <td className="px-3 py-1.5">
                      {picked ? (
                        <AmountInput
                          value={amounts[r.salesVoucherId] ?? 0}
                          onChange={(v) =>
                            setAmounts((prev) => ({ ...prev, [r.salesVoucherId]: v }))
                          }
                          className={over ? 'border-red-400 text-red-600' : ''}
                        />
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {overAllocated && (
          <p className="text-xs text-red-600">Số thu không được vượt số còn phải thu của chứng từ.</p>
        )}
      </div>
    </Modal>
  )
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}
