import { CashVoucherCategory, CashVoucherType } from '@app/shared'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
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

  const close = () => navigate('/cash')

  // Số chứng từ trong tiêu đề (vd "Phiếu thu PT4602/2026") — query dedupe với form.
  const { data: voucher } = useCashVoucher(mode === 'new' ? null : (id ?? null))

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
        readOnly={mode === 'view'}
        prefill={prefill}
        onSaved={close}
        onCancel={close}
      />
    </RecordPageShell>
  )
}
