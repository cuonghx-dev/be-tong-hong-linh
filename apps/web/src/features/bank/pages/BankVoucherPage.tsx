import { BankVoucherType } from '@app/shared'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { getApiErrorMessage } from '@/shared/lib/api'
import { Button } from '@/shared/ui/button'
import { useConfirm } from '@/shared/ui/confirm-dialog'
import { PlusSquareIcon, TrashIcon } from '@/shared/ui/icons'
import { useToast } from '@/shared/ui/toast'
import { useDeleteBankVoucher } from '../api/useBankVoucherMutations'
import { BankVoucherForm } from '../components/BankVoucherForm'

type Mode = 'new' | 'view' | 'edit'

// Trang chứng từ tiền gửi full-page (§5 design.md). Route: /bank/vouchers/{new|:id|:id/edit}
export function BankVoucherPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [sp] = useSearchParams()
  const type = (sp.get('type') as BankVoucherType) ?? BankVoucherType.Receipt
  const isReceipt = type === BankVoucherType.Receipt
  const confirm = useConfirm()
  const { toast } = useToast()
  const del = useDeleteBankVoucher()

  const close = () => navigate('/bank')

  const noun = isReceipt ? 'phiếu thu tiền gửi' : 'ủy nhiệm chi'
  const title =
    mode === 'new'
      ? isReceipt
        ? 'Thu tiền gửi'
        : 'Ủy nhiệm chi'
      : mode === 'edit'
        ? `Sửa ${noun}`
        : `Xem ${noun}`

  // Sửa nhanh: chuyển sang mode edit tại chỗ. Bỏ ghi: xóa chứng từ (chưa có trạng thái ghi sổ).
  const quickEdit = () => id && navigate(`/bank/vouchers/${id}/edit?type=${type}`)
  const unpost = async () => {
    if (!id) return
    const ok = await confirm({
      title: `Bỏ ghi chứng từ ${noun}?`,
      description: 'Chứng từ sẽ bị xóa khỏi sổ. Hành động này không thể hoàn tác.',
      confirmText: 'Bỏ ghi',
      destructive: true,
    })
    if (!ok) return
    del.mutate(id, {
      onSuccess: close,
      onError: (e) =>
        toast({
          variant: 'error',
          title: 'Bỏ ghi chứng từ thất bại',
          description: getApiErrorMessage(e),
        }),
    })
  }

  return (
    <RecordPageShell title={title} onClose={close}>
      <BankVoucherForm
        type={type}
        voucherId={id ?? null}
        readOnly={mode === 'view'}
        onSaved={close}
        onCancel={close}
      />

      {/* Action nổi góc dưới phải — chỉ ở chế độ xem chứng từ đã lưu */}
      {mode === 'view' && id && (
        <div className="fixed bottom-6 right-6 z-20 flex gap-2">
          <Button type="button" variant="outline" onClick={quickEdit} className="shadow-md">
            <PlusSquareIcon size={16} /> Sửa nhanh
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={unpost}
            disabled={del.isPending}
            className="border-red-200 text-red-600 shadow-md hover:bg-red-50"
          >
            <TrashIcon size={16} /> {del.isPending ? 'Đang bỏ ghi…' : 'Bỏ ghi'}
          </Button>
        </div>
      )}
    </RecordPageShell>
  )
}
