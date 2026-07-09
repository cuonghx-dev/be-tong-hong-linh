import { useNavigate, useParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { DisposalForm } from '../components/DisposalForm'

type Mode = 'new' | 'view' | 'edit'

// Trang chứng từ ghi giảm TSCD full-page (§5 design.md).
// Route: /fixed-asset/disposals/{new|:id|:id/edit}
export function FixedAssetDisposalPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { id } = useParams()

  const close = () => navigate('/fixed-asset')

  const title =
    mode === 'new'
      ? 'Ghi giảm tài sản cố định'
      : mode === 'edit'
        ? 'Sửa chứng từ ghi giảm'
        : 'Xem chứng từ ghi giảm'

  return (
    <RecordPageShell title={title} onClose={close}>
      <DisposalForm
        disposalId={id ?? null}
        readOnly={mode === 'view'}
        onSaved={close}
        onCancel={close}
      />
    </RecordPageShell>
  )
}
