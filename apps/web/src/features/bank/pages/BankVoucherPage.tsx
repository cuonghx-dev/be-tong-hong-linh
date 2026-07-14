import { BankVoucherType } from '@app/shared'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { getApiErrorMessage } from '@/shared/lib/api'
import { Button } from '@/shared/ui/button'
import { BookIcon, PlusSquareIcon, TrashIcon } from '@/shared/ui/icons'
import { useToast } from '@/shared/ui/toast'
import { useSetBankVoucherPosted } from '../api/useBankVoucherMutations'
import { useBankVoucher } from '../api/useBankVouchers'
import { BankVoucherForm } from '../components/BankVoucherForm'

type Mode = 'new' | 'view' | 'edit'

// Trang chứng từ tiền gửi full-page (§5 design.md). Route: /bank/vouchers/{new|:id|:id/edit}
export function BankVoucherPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [sp] = useSearchParams()
  const type = (sp.get('type') as BankVoucherType) ?? BankVoucherType.Receipt
  const isReceipt = type === BankVoucherType.Receipt
  const { toast } = useToast()
  const setPosted = useSetBankVoucherPosted()

  // Nhân bản: tạo mới từ chứng từ nguồn (điền sẵn, cấp số chứng từ mới khi Cất).
  const duplicateFromId = mode === 'new' ? sp.get('duplicateFrom') : null

  const close = () => navigate('/bank')

  // Trạng thái ghi sổ cho action nổi — query dedupe với form.
  const { data: voucher } = useBankVoucher(mode === 'new' ? null : (id ?? null))

  const noun = isReceipt ? 'phiếu thu tiền gửi' : 'ủy nhiệm chi'
  const title =
    mode === 'new'
      ? isReceipt
        ? 'Thu tiền gửi'
        : 'Ủy nhiệm chi'
      : mode === 'edit'
        ? `Sửa ${noun}`
        : `Xem ${noun}`

  // Sửa nhanh: chuyển sang mode edit tại chỗ. Bỏ ghi/Ghi sổ: toggle trạng thái ghi sổ (đảo lại được).
  const quickEdit = () => id && navigate(`/bank/vouchers/${id}/edit?type=${type}`)
  const togglePosted = () => {
    if (!id || !voucher) return
    setPosted.mutate(
      { id, posted: !voucher.posted },
      {
        onError: (e) =>
          toast({
            variant: 'error',
            title: voucher.posted ? 'Bỏ ghi thất bại' : 'Ghi sổ thất bại',
            description: getApiErrorMessage(e),
          }),
      },
    )
  }

  return (
    <RecordPageShell title={title} onClose={close}>
      <BankVoucherForm
        type={type}
        voucherId={id ?? null}
        duplicateFromId={duplicateFromId}
        readOnly={mode === 'view'}
        onSaved={close}
        onCancel={close}
      />

      {/* Action nổi góc dưới phải — chỉ ở chế độ xem chứng từ đã lưu */}
      {mode === 'view' && id && voucher && (
        <div className="fixed bottom-6 right-6 z-20 flex gap-2">
          <Button type="button" variant="outline" onClick={quickEdit} className="shadow-md">
            <PlusSquareIcon size={16} /> Sửa nhanh
          </Button>
          {voucher.posted ? (
            <Button
              type="button"
              variant="outline"
              onClick={togglePosted}
              disabled={setPosted.isPending}
              className="border-red-200 text-red-600 shadow-md hover:bg-red-50"
            >
              <TrashIcon size={16} /> {setPosted.isPending ? 'Đang bỏ ghi…' : 'Bỏ ghi'}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={togglePosted}
              disabled={setPosted.isPending}
              className="shadow-md"
            >
              <BookIcon size={16} /> {setPosted.isPending ? 'Đang ghi sổ…' : 'Ghi sổ'}
            </Button>
          )}
        </div>
      )}
    </RecordPageShell>
  )
}
