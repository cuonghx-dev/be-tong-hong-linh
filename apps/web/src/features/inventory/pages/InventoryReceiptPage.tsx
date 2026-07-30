import { InventoryReceiptType } from '@app/shared'
import { useParams, useSearchParams } from 'react-router-dom'
import { useNavigateBack } from '@/shared/hooks/use-navigate-back'
import { ReceiptForm } from '../components/ReceiptForm'
import { DEFAULT_RECEIPT_TYPE } from '../types'

type Mode = 'new' | 'view' | 'edit'

// Trang phiếu nhập kho full-page (§5 design.md). Route: /inventory/receipts/{new|:id|:id/edit}
export function InventoryReceiptPage({ mode }: { mode: Mode }) {
  const { id } = useParams()
  const [sp] = useSearchParams()
  // Lập tay chỉ có "Nhập kho thành phẩm sản xuất"; loại mua hàng do chứng từ mua hàng tự sinh.
  const type = (sp.get('type') as InventoryReceiptType) ?? DEFAULT_RECEIPT_TYPE
  // Nhân bản: tạo mới nhưng nạp sẵn dữ liệu từ phiếu nguồn.
  const duplicateFromId = mode === 'new' ? sp.get('duplicateFrom') : null

  const close = useNavigateBack('/inventory')

  // Form tự dựng page header / action bar (§5 design.md) vì các control ở đó đọc-ghi
  // trực tiếp state form (loại chứng từ, số phiếu, tổng tiền) → không bọc RecordPageShell.
  return (
    <ReceiptForm
      type={type}
      receiptId={id ?? null}
      duplicateFromId={duplicateFromId}
      readOnly={mode === 'view'}
      onSaved={close}
      onCancel={close}
    />
  )
}
