import { PurchaseVoucherType } from '@app/shared'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { PurchaseVoucherForm } from '../components/PurchaseVoucherForm'
import { VOUCHER_TYPE_LABEL } from '../types'

type Mode = 'new' | 'view' | 'edit'

// Trang chứng từ mua hàng full-page (§5 design.md). Route: /purchase/vouchers/{new|:id|:id/edit}
export function PurchaseVoucherPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [sp] = useSearchParams()
  const type = (sp.get('type') as PurchaseVoucherType) ?? PurchaseVoucherType.Stock

  const close = () => navigate('/purchase')

  const title =
    mode === 'new'
      ? VOUCHER_TYPE_LABEL[type]
      : mode === 'edit'
        ? 'Sửa chứng từ mua hàng'
        : 'Xem chứng từ mua hàng'

  return (
    <RecordPageShell title={title} onClose={close}>
      <PurchaseVoucherForm
        type={type}
        voucherId={id ?? null}
        readOnly={mode === 'view'}
        onSaved={close}
        onCancel={close}
      />
    </RecordPageShell>
  )
}
