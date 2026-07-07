import { CashVoucherType } from '@app/shared'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { CashVoucherForm } from '../components/CashVoucherForm'

type Mode = 'new' | 'view' | 'edit'

// Trang chứng từ thu/chi full-page (§5 design.md). Route: /cash/vouchers/{new|:id|:id/edit}
export function CashVoucherPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [sp] = useSearchParams()
  const type = (sp.get('type') as CashVoucherType) ?? CashVoucherType.Receipt
  const isReceipt = type === CashVoucherType.Receipt

  const close = () => navigate('/cash')

  const noun = isReceipt ? 'phiếu thu' : 'phiếu chi'
  const title =
    mode === 'new'
      ? isReceipt
        ? 'Phiếu thu'
        : 'Phiếu chi'
      : mode === 'edit'
        ? `Sửa ${noun}`
        : `Xem ${noun}`

  return (
    <RecordPageShell title={title} onClose={close}>
      <CashVoucherForm
        type={type}
        voucherId={id ?? null}
        readOnly={mode === 'view'}
        onSaved={close}
        onCancel={close}
      />
    </RecordPageShell>
  )
}
