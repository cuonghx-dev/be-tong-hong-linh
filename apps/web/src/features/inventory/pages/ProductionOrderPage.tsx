import { useNavigate, useParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { ProductionOrderForm } from '../components/ProductionOrderForm'

type Mode = 'new' | 'view' | 'edit'

// Trang lệnh sản xuất full-page (§5 design.md). Route: /inventory/production-orders/{new|:id|:id/edit}
export function ProductionOrderPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { id } = useParams()

  const close = () => navigate('/inventory')

  const title =
    mode === 'new'
      ? 'Lệnh sản xuất'
      : mode === 'edit'
        ? 'Sửa lệnh sản xuất'
        : 'Xem lệnh sản xuất'

  return (
    <RecordPageShell title={title} onClose={close}>
      <ProductionOrderForm
        orderId={id ?? null}
        readOnly={mode === 'view'}
        onSaved={close}
        onCancel={close}
      />
    </RecordPageShell>
  )
}
