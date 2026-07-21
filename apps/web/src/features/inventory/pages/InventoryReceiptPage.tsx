import { InventoryReceiptType } from '@app/shared'
import { useParams, useSearchParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { useNavigateBack } from '@/shared/hooks/use-navigate-back'
import { ReceiptForm } from '../components/ReceiptForm'
import { RECEIPT_TYPE_LABEL } from '../types'

type Mode = 'new' | 'view' | 'edit'

// Trang phiếu nhập kho full-page (§5 design.md). Route: /inventory/receipts/{new|:id|:id/edit}
export function InventoryReceiptPage({ mode }: { mode: Mode }) {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const type = (sp.get('type') as InventoryReceiptType) ?? InventoryReceiptType.Purchase
  // Nhân bản: tạo mới nhưng nạp sẵn dữ liệu từ phiếu nguồn.
  const duplicateFromId = mode === 'new' ? sp.get('duplicateFrom') : null

  const close = useNavigateBack('/inventory')

  const title =
    mode === 'new'
      ? `Phiếu nhập kho — ${RECEIPT_TYPE_LABEL[type]}`
      : mode === 'edit'
        ? 'Sửa phiếu nhập kho'
        : 'Xem phiếu nhập kho'

  return (
    <RecordPageShell title={title} onClose={close}>
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
