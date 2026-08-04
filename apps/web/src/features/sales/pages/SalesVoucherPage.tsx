import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useNavigateBack } from '@/shared/hooks/use-navigate-back'
import { getApiErrorMessage } from '@/shared/lib/api'
import { Button } from '@/shared/ui/button'
import { BookIcon, PlusSquareIcon, TrashIcon } from '@/shared/ui/icons'
import { useToast } from '@/shared/ui/toast'
import { useSetSalesVoucherPosted } from '../api/useSalesVoucherMutations'
import { useSalesVoucher } from '../api/useSalesVouchers'
import { SalesVoucherForm } from '../components/SalesVoucherForm'

type Mode = 'new' | 'view' | 'edit'

// Trang chứng từ bán hàng full-page (§5 design.md). Route: /sales/vouchers/{new|:id|:id/edit}
export function SalesVoucherPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
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

  const { data: voucher } = useSalesVoucher(mode === 'new' ? null : (id ?? null))
  const { toast } = useToast()
  const setPosted = useSetSalesVoucherPosted()

  // Sửa nhanh: chuyển sang mode edit tại chỗ. Bỏ ghi/Ghi sổ: toggle trạng thái ghi sổ (đảo lại được).
  const quickEdit = () => id && navigate(`/sales/vouchers/${id}/edit`)
  const togglePosted = () => {
    if (!id || !voucher) return
    setPosted.mutate(
      { id, posted: !voucher.posted },
      {
        onError: (e) =>
          toast({
            variant: 'error',
            title: voucher.posted ? 'Bỏ ghi thất bại' : 'Ghi sổ thất bại',
            description: getApiErrorMessage(e),
          }),
      },
    )
  }

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
      // Sửa nhanh + Ghi sổ/Bỏ ghi ở footer — chỉ ở chế độ xem.
      actions={
        mode === 'view' && id && voucher ? (
          <>
            <Button type="button" variant="outline" onClick={quickEdit}>
              <PlusSquareIcon size={16} /> Sửa nhanh
            </Button>
            {voucher.posted ? (
              <Button
                type="button"
                variant="outline"
                onClick={togglePosted}
                disabled={setPosted.isPending}
                className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <TrashIcon size={16} /> {setPosted.isPending ? 'Đang bỏ ghi…' : 'Bỏ ghi'}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={togglePosted}
                disabled={setPosted.isPending}
              >
                <BookIcon size={16} /> {setPosted.isPending ? 'Đang ghi sổ…' : 'Ghi sổ'}
              </Button>
            )}
          </>
        ) : undefined
      }
    />
  )
}
