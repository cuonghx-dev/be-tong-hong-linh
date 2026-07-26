import { PurchaseVoucherType } from '@app/shared'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { useNavigateBack } from '@/shared/hooks/use-navigate-back'
import { getApiErrorMessage } from '@/shared/lib/api'
import { Button } from '@/shared/ui/button'
import { BookIcon, PlusSquareIcon, TrashIcon } from '@/shared/ui/icons'
import { useToast } from '@/shared/ui/toast'
import { useSetPurchaseVoucherPosted } from '../api/usePurchaseVoucherMutations'
import { usePurchaseVoucher } from '../api/usePurchaseVouchers'
import { PurchaseVoucherForm } from '../components/PurchaseVoucherForm'

type Mode = 'new' | 'view' | 'edit'

// Trang chứng từ mua hàng full-page (§5 design.md). Route: /purchase/vouchers/{new|:id|:id/edit}
export function PurchaseVoucherPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [sp] = useSearchParams()
  const type = (sp.get('type') as PurchaseVoucherType) ?? PurchaseVoucherType.Stock

  // Nhân bản: tạo mới từ chứng từ nguồn (điền sẵn, cấp số chứng từ mới khi Lưu).
  const duplicateFromId = mode === 'new' ? sp.get('duplicateFrom') : null

  // Lập CT từ danh mục NCC: điền sẵn nhà cung cấp qua query params.
  const supplierCode = mode === 'new' ? sp.get('supplier') : null
  const initialSupplier = supplierCode
    ? {
        code: supplierCode,
        name: sp.get('supplierName') ?? '',
        address: sp.get('supplierAddress') ?? undefined,
      }
    : null

  const close = useNavigateBack('/purchase')

  const { data: voucher } = usePurchaseVoucher(mode === 'new' ? null : (id ?? null))
  const { toast } = useToast()
  const setPosted = useSetPurchaseVoucherPosted()

  // Sửa nhanh: chuyển sang mode edit tại chỗ. Bỏ ghi/Ghi sổ: toggle trạng thái ghi sổ (đảo lại được).
  const quickEdit = () => id && navigate(`/purchase/vouchers/${id}/edit?type=${type}`)
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

  // Loại chứng từ đổi được ngay trong form (combobox "Lý do") → title tĩnh.
  const title =
    mode === 'new'
      ? 'Chứng từ mua hàng'
      : mode === 'edit'
        ? 'Sửa chứng từ mua hàng'
        : 'Xem chứng từ mua hàng'

  return (
    <RecordPageShell title={title} onClose={close}>
      <PurchaseVoucherForm
        type={type}
        voucherId={id ?? null}
        duplicateFromId={duplicateFromId}
        initialSupplier={initialSupplier}
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
    </RecordPageShell>
  )
}
