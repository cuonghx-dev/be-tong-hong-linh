import { InventoryReceiptType } from '@app/shared'
import { useParams, useSearchParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { useNavigateBack } from '@/shared/hooks/use-navigate-back'
import { ReceiptForm } from '../components/ReceiptForm'

type Mode = 'new' | 'view' | 'edit'

// Trang phiếu nhập kho full-page (§5 design.md). Route: /inventory/receipts/{new|:id|:id/edit}
export function InventoryReceiptPage({ mode }: { mode: Mode }) {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const type = (sp.get('type') as InventoryReceiptType) ?? InventoryReceiptType.Purchase
  // Nhân bản: tạo mới nhưng nạp sẵn dữ liệu từ phiếu nguồn.
  const duplicateFromId = mode === 'new' ? sp.get('duplicateFrom') : null

  const close = useNavigateBack('/inventory')

  // Loại chứng từ đổi được ngay trong form (Select "Loại chứng từ") → title tĩnh.
  const title =
    mode === 'new'
      ? 'Phiếu nhập kho'
      : mode === 'edit'
        ? 'Sửa phiếu nhập kho'
        : 'Xem phiếu nhập kho'

  return (
    // Header nền primary nhạt liền khối với vùng thông tin chung của form (2 lớp màu, đồng bộ cash).
    <RecordPageShell
      title={title}
      onClose={close}
      headerClassName="border-b-0 bg-primary/5"
      contentClassName="p-0"
    >
      <ReceiptForm
        type={type}
        receiptId={id ?? null}
        duplicateFromId={duplicateFromId}
        readOnly={mode === 'view'}
        onSaved={close}
        onCancel={close}
      />
    </RecordPageShell>
  )
}
