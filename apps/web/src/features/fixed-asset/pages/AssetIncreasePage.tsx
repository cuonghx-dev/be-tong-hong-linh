import { useNavigate, useParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { AssetIncreaseForm } from '../components/AssetIncreaseForm'

type Mode = 'new' | 'view' | 'edit'

// Trang chứng từ ghi tăng TSCD full-page (§5 design.md).
// Route: /fixed-asset/increases/{new|:id|:id/edit}
export function AssetIncreasePage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { id } = useParams()

  const close = () => navigate('/fixed-asset')

  const title =
    mode === 'new'
      ? 'Ghi tăng tài sản cố định'
      : mode === 'edit'
        ? 'Sửa chứng từ ghi tăng'
        : 'Xem chứng từ ghi tăng'

  return (
    <RecordPageShell title={title} onClose={close}>
      <AssetIncreaseForm
        assetId={id ?? null}
        readOnly={mode === 'view'}
        onSaved={close}
        onCancel={close}
      />
    </RecordPageShell>
  )
}
