import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { GeneralVoucherForm } from '../components/GeneralVoucherForm'

type Mode = 'new' | 'view' | 'edit'

// Trang chứng từ nghiệp vụ khác full-page (§5 design.md).
// Route: /general/vouchers/{new|:id|:id/edit}
export function GeneralVoucherPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [sp] = useSearchParams()
  // Nhân bản: tạo mới nhưng nạp sẵn dữ liệu từ chứng từ nguồn.
  const duplicateFromId = mode === 'new' ? sp.get('duplicateFrom') : null

  const close = () => navigate('/general')

  const title =
    mode === 'new'
      ? 'Chứng từ nghiệp vụ khác'
      : mode === 'edit'
        ? 'Sửa chứng từ nghiệp vụ khác'
        : 'Xem chứng từ nghiệp vụ khác'

  return (
    <RecordPageShell title={title} onClose={close}>
      <GeneralVoucherForm
        voucherId={id ?? null}
        duplicateFromId={duplicateFromId}
        readOnly={mode === 'view'}
        onSaved={close}
        onCancel={close}
      />
    </RecordPageShell>
  )
}
