import { useNavigate, useParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { SalesVoucherForm } from '../components/SalesVoucherForm'

type Mode = 'new' | 'view' | 'edit'

// Trang chứng từ bán hàng full-page (§5 design.md). Route: /sales/vouchers/{new|:id|:id/edit}
export function SalesVoucherPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { id } = useParams()

  const close = () => navigate('/sales')

  const title =
    mode === 'new'
      ? 'Chứng từ bán hàng'
      : mode === 'edit'
        ? 'Sửa chứng từ bán hàng'
        : 'Xem chứng từ bán hàng'

  return (
    <RecordPageShell title={title} onClose={close}>
      <SalesVoucherForm
        voucherId={id ?? null}
        readOnly={mode === 'view'}
        onSaved={close}
        onCancel={close}
      />
    </RecordPageShell>
  )
}
