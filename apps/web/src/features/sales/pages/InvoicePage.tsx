import { useNavigate, useParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { InvoiceForm } from '../components/InvoiceForm'

type Mode = 'new' | 'view'

// Trang hóa đơn full-page (§5 design.md). Route: /sales/invoices/{new|:id}
export function InvoicePage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { id } = useParams()

  const close = () => navigate('/sales')

  const title = mode === 'new' ? 'Thêm hóa đơn' : 'Xem hóa đơn'

  return (
    <RecordPageShell title={title} onClose={close}>
      <InvoiceForm
        invoiceId={id ?? null}
        readOnly={mode === 'view'}
        onSaved={close}
        onCancel={close}
      />
    </RecordPageShell>
  )
}
