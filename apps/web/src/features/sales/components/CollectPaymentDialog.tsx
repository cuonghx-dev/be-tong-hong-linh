import { PaymentMethod } from '@app/shared'
import { useEffect, useMemo, useState } from 'react'
import { useBankAccounts } from '@/features/catalog'
import { getApiErrorMessage } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { useToast } from '@/shared/ui/toast'
import { AmountInput } from '@/shared/ui/amount-input'
import { Checkbox } from '@/shared/ui/checkbox'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useCollectPayment, useOpenReceivables } from '../api/useReceivables'
import { PAYMENT_METHOD_LABEL } from '../types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

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
            <Label className="text-xs font-medium text-slate-500">Ngày thu</Label>
            <Input
              type="date"
              value={postingDate}
              onChange={(e) => setPostingDate(e.target.value)}
              className="h-8 w-auto px-2"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500">Hình thức thu</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger className="h-8 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PaymentMethod).map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needBank && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500">TK ngân hàng nhận</Label>
              <Select
                value={bankAccountNo || undefined}
                onValueChange={(no) => {
                  const acc = bankAccounts.data?.data.find((a) => a.accountNumber === no)
                  setBankAccountNo(no)
                  setBankName(acc?.bankName ?? '')
                }}
              >
                <SelectTrigger className="h-8 min-w-[220px] rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <SelectValue placeholder="— Chọn tài khoản —" />
                </SelectTrigger>
                <SelectContent>
                  {(bankAccounts.data?.data ?? []).map((a) => (
                    <SelectItem key={a.accountNumber} value={a.accountNumber}>
                      {a.accountNumber} — {a.bankName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="max-h-[380px] overflow-auto rounded-md border border-border">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 px-2" />
                <TableHead>Chứng&nbsp;từ</TableHead>
                <TableHead>Ngày</TableHead>
                <TableHead>Hạn&nbsp;TT</TableHead>
                <TableHead className="text-right">Còn phải&nbsp;thu</TableHead>
                <TableHead className="w-40 text-right">Số&nbsp;thu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {open.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                    Đang tải…
                  </TableCell>
                </TableRow>
              )}
              {!open.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                    Khách hàng không còn chứng từ phải thu.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const remaining = Number(r.remainingAmount)
                const picked = amounts[r.salesVoucherId] !== undefined
                const over = (amounts[r.salesVoucherId] ?? 0) > remaining
                return (
                  <TableRow key={r.salesVoucherId}>
                    <TableCell className="px-2 py-1.5 text-center">
                      <Checkbox
                        checked={picked}
                        onCheckedChange={() => toggle(r.salesVoucherId, remaining)}
                      />
                    </TableCell>
                    <TableCell className="py-1.5 text-slate-700">
                      {r.voucherNo}
                      {r.invoiceNo && (
                        <span className="block text-xs text-slate-400">HĐ {r.invoiceNo}</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-1.5 text-slate-600">
                      {formatDate(r.postingDate)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-1.5 text-slate-600">
                      {r.dueDate ? formatDate(r.dueDate) : ''}
                    </TableCell>
                    <TableCell className="py-1.5 text-right tabular-nums text-slate-700">
                      {formatCurrency(remaining)}
                    </TableCell>
                    <TableCell className="py-1.5">
                      {picked ? (
                        <AmountInput
                          value={amounts[r.salesVoucherId] ?? 0}
                          onChange={(v) =>
                            setAmounts((prev) => ({ ...prev, [r.salesVoucherId]: v }))
                          }
                          className={over ? 'border-red-400 text-red-600' : ''}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
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
