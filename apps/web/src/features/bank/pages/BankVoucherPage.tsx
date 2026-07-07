import { BankVoucherType } from '@app/shared'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { BankVoucherForm } from '../components/BankVoucherForm'

type Mode = 'new' | 'view' | 'edit'

// Trang chứng từ tiền gửi full-page (§5 design.md). Route: /bank/vouchers/{new|:id|:id/edit}
export function BankVoucherPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [sp] = useSearchParams()
  const type = (sp.get('type') as BankVoucherType) ?? BankVoucherType.Receipt
  const isReceipt = type === BankVoucherType.Receipt

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

  return (
    <RecordPageShell title={title} onClose={close}>
      <BankVoucherForm
        type={type}
        voucherId={id ?? null}
        readOnly={mode === 'view'}
        onSaved={close}
        onCancel={close}
      />
    </RecordPageShell>
  )
}
