import { useEffect, useState } from 'react'
import { getApiErrorMessage } from '@/shared/lib/api'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { useToast } from '@/shared/ui/toast'
import { useUpdateSalesVoucher } from '../api/useSalesVoucherMutations'

interface IssueInvoiceDialogProps {
  // Chứng từ cần phát hành hóa đơn; null = đóng dialog.
  voucher: { id: string; voucherNo: string } | null
  onClose: () => void
}

// Phát hành hóa đơn cho chứng từ bán hàng chưa có số hóa đơn: nhập số HĐ,
// lưu vào chứng từ + bật cờ "Lập kèm hóa đơn". (Chưa tích hợp HĐĐT — số nhập tay.)
export function IssueInvoiceDialog({ voucher, onClose }: IssueInvoiceDialogProps) {
  const [invoiceNo, setInvoiceNo] = useState('')
  const update = useUpdateSalesVoucher()
  const { toast } = useToast()

  // Mở dialog cho chứng từ khác → xóa số đã gõ trước đó.
  useEffect(() => {
    if (voucher) setInvoiceNo('')
  }, [voucher])

  const save = async () => {
    if (!voucher || !invoiceNo.trim()) return
    try {
      await update.mutateAsync({
        id: voucher.id,
        dto: { invoiceNo: invoiceNo.trim(), withInvoice: true },
      })
      toast({
        variant: 'success',
        title: 'Đã phát hành hóa đơn',
        description: `Chứng từ ${voucher.voucherNo} — số hóa đơn ${invoiceNo.trim()}.`,
      })
      onClose()
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Phát hành hóa đơn thất bại',
        description: getApiErrorMessage(e),
      })
    }
  }

  return (
    <Modal
      open={!!voucher}
      onClose={onClose}
      title={`Phát hành hóa đơn — ${voucher?.voucherNo ?? ''}`}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={update.isPending}>
            Hủy
          </Button>
          <Button onClick={save} disabled={update.isPending || !invoiceNo.trim()}>
            {update.isPending ? 'Đang lưu…' : 'Phát hành'}
          </Button>
        </>
      }
    >
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500">Số hóa đơn</label>
        <input
          autoFocus
          value={invoiceNo}
          onChange={(e) => setInvoiceNo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="VD: 00004693"
          className="h-9 w-full rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </Modal>
  )
}
