import { useParams, useSearchParams } from 'react-router-dom'
import { useNavigateBack } from '@/shared/hooks/use-navigate-back'
import { SalesVoucherForm } from '../components/SalesVoucherForm'

type Mode = 'new' | 'view' | 'edit'

// Trang chứng từ bán hàng full-page (§5 design.md). Route: /sales/vouchers/{new|:id|:id/edit}
export function SalesVoucherPage({ mode }: { mode: Mode }) {
  const { id } = useParams()
  const [sp] = useSearchParams()
  // Nhân bản: tạo mới nhưng nạp sẵn dữ liệu từ chứng từ nguồn.
  const duplicateFromId = mode === 'new' ? sp.get('duplicateFrom') : null

  // Lập CT từ danh mục KH: điền sẵn khách hàng qua query params.
  const customerCode = mode === 'new' ? sp.get('customer') : null
  const initialCustomer = customerCode
    ? {
        code: customerCode,
        name: sp.get('customerName') ?? '',
        address: sp.get('customerAddress') ?? undefined,
      }
    : null

  const close = useNavigateBack('/sales')

  // Form tự dựng cả page header / sub-header / action bar (§5 design.md) vì các
  // control ở đó đọc-ghi trực tiếp state form (loại nghiệp vụ, tùy chọn thanh
  // toán, tổng tiền) → không bọc RecordPageShell.
  return (
    <SalesVoucherForm
      voucherId={id ?? null}
      duplicateFromId={duplicateFromId}
      initialCustomer={initialCustomer}
      readOnly={mode === 'view'}
      onSaved={close}
      onCancel={close}
    />
  )
}
