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

// Kiểu nút outline trắng trên thanh action nền tối (đồng bộ nút Hủy/Đóng của form).
const DARK_BAR_BTN = 'border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white'

// Trang chứng từ tiền gửi full-page (§5 design.md). Route: /bank/vouchers/{new|:id|:id/edit}
export function BankVoucherPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [sp] = useSearchParams()
  const type = (sp.get('type') as BankVoucherType) ?? BankVoucherType.Receipt
  const isReceipt = type === BankVoucherType.Receipt
  const { toast } = useToast()
  const setPosted = useSetBankVoucherPosted()

  // Nhân bản: tạo mới từ chứng từ nguồn (điền sẵn, cấp số chứng từ mới khi Lưu).
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
    // p-0 để form tự quản padding — action bar tối dính đáy, tràn hết bề ngang (đồng bộ cash).
    <RecordPageShell title={title} onClose={close} contentClassName="p-0">
      <BankVoucherForm
        type={type}
        voucherId={id ?? null}
        duplicateFromId={duplicateFromId}
        readOnly={mode === 'view'}
        onSaved={close}
        onCancel={close}
        // Sửa nhanh + Ghi sổ/Bỏ ghi nằm trong thanh action đáy (nền tối) — chỉ ở chế độ xem.
        actions={
          mode === 'view' && id && voucher ? (
            <>
              <Button type="button" variant="outline" onClick={quickEdit} className={DARK_BAR_BTN}>
                <PlusSquareIcon size={16} /> Sửa nhanh
              </Button>
              {voucher.posted ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={togglePosted}
                  disabled={setPosted.isPending}
                  className="border-red-400/40 bg-transparent text-red-300 hover:bg-red-500/10 hover:text-red-200"
                >
                  <TrashIcon size={16} /> {setPosted.isPending ? 'Đang bỏ ghi…' : 'Bỏ ghi'}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={togglePosted}
                  disabled={setPosted.isPending}
                  className={DARK_BAR_BTN}
                >
                  <BookIcon size={16} /> {setPosted.isPending ? 'Đang ghi sổ…' : 'Ghi sổ'}
                </Button>
              )}
            </>
          ) : undefined
        }
      />
    </RecordPageShell>
  )
}
