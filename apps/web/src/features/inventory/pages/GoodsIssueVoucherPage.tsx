import { GoodsIssueCategory } from '@app/shared'
import { useParams, useSearchParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { useNavigateBack } from '@/shared/hooks/use-navigate-back'
import { GoodsIssueForm } from '../components/GoodsIssueForm'

type Mode = 'new' | 'view' | 'edit'

// Trang phiếu xuất kho full-page (§5 design.md). Route: /inventory/issues/{new|:id|:id/edit}
export function GoodsIssueVoucherPage({ mode }: { mode: Mode }) {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const category = (sp.get('category') as GoodsIssueCategory) ?? GoodsIssueCategory.Sales
  // Nhân bản: tạo mới nhưng nạp sẵn dữ liệu từ phiếu nguồn.
  const duplicateFromId = mode === 'new' ? sp.get('duplicateFrom') : null

  const close = useNavigateBack('/inventory')

  const title =
    mode === 'new'
      ? 'Phiếu xuất kho'
      : mode === 'edit'
        ? 'Sửa phiếu xuất kho'
        : 'Xem phiếu xuất kho'

  return (
    // Header nền primary nhạt liền khối với vùng thông tin chung của form (2 lớp màu, đồng bộ cash).
    <RecordPageShell
      title={title}
      onClose={close}
      headerClassName="border-b-0 bg-primary/5"
      contentClassName="p-0"
    >
      <GoodsIssueForm
        category={category}
        voucherId={id ?? null}
        duplicateFromId={duplicateFromId}
        readOnly={mode === 'view'}
        onSaved={close}
        onCancel={close}
      />
    </RecordPageShell>
  )
}
