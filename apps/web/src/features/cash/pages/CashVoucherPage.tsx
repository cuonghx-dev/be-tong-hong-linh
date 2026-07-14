import { CashVoucherCategory, CashVoucherType } from '@app/shared'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { getApiErrorMessage } from '@/shared/lib/api'
import { Button } from '@/shared/ui/button'
import { BookIcon, PlusSquareIcon, TrashIcon } from '@/shared/ui/icons'
import { useToast } from '@/shared/ui/toast'
import { useSetCashVoucherPosted } from '../api/useCashVoucherMutations'
import { useCashVoucher } from '../api/useCashVouchers'
import { CashVoucherForm } from '../components/CashVoucherForm'

type Mode = 'new' | 'view' | 'edit'

// Trang chứng từ thu/chi full-page (§5 design.md). Route: /cash/vouchers/{new|:id|:id/edit}
export function CashVoucherPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [sp] = useSearchParams()
  const type = (sp.get('type') as CashVoucherType) ?? CashVoucherType.Receipt
  const isReceipt = type === CashVoucherType.Receipt

  // Điền sẵn khi mở từ nơi khác (vd. "Thu nợ" ở bảng Công nợ) — chỉ áp dụng lúc tạo mới.
  const prefill =
    mode === 'new'
      ? {
          category: (sp.get('category') as CashVoucherCategory) ?? undefined,
          partnerId: sp.get('partnerId') ?? undefined,
          partnerName: sp.get('partnerName') ?? undefined,
        }
      : undefined

  // Nhân bản: tạo mới từ phiếu nguồn (điền sẵn, cấp số phiếu mới khi Cất).
  const duplicateFromId = mode === 'new' ? sp.get('duplicateFrom') : null

  const close = () => navigate('/cash')

  // Số chứng từ trong tiêu đề (vd "Phiếu thu PT4602/2026") — query dedupe với form.
  const { data: voucher } = useCashVoucher(mode === 'new' ? null : (id ?? null))
  const { toast } = useToast()
  const setPosted = useSetCashVoucherPosted()

  // Sửa nhanh: chuyển sang mode edit tại chỗ. Bỏ ghi/Ghi sổ: toggle trạng thái ghi sổ (đảo lại được).
  const quickEdit = () => id && navigate(`/cash/vouchers/${id}/edit?type=${type}`)
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

  const noun = isReceipt ? 'Phiếu thu' : 'Phiếu chi'
  const title = [
    mode === 'edit' ? `Sửa ${noun.toLowerCase()}` : mode === 'view' ? `Xem ${noun.toLowerCase()}` : noun,
    voucher?.voucherNo,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <RecordPageShell
      title={title}
      onClose={close}
      // Vùng đầu trang tô nhạt theo màu thương hiệu — liền khối với vùng thông tin chung của form.
      headerClassName="border-b-0 bg-primary/5"
      contentClassName="p-0"
    >
      <CashVoucherForm
        type={type}
        voucherId={id ?? null}
        duplicateFromId={duplicateFromId}
        readOnly={mode === 'view'}
        prefill={prefill}
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
