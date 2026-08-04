import { GoodsIssueCategory } from '@app/shared'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useNavigateBack } from '@/shared/hooks/use-navigate-back'
import { getApiErrorMessage } from '@/shared/lib/api'
import { Button } from '@/shared/ui/button'
import { BookIcon, PlusSquareIcon, TrashIcon } from '@/shared/ui/icons'
import { useToast } from '@/shared/ui/toast'
import { useSetGoodsIssuePosted } from '../api/useGoodsIssueMutations'
import { useGoodsIssue } from '../api/useGoodsIssues'
import { GoodsIssueForm } from '../components/GoodsIssueForm'

type Mode = 'new' | 'view' | 'edit'

// Trang phiếu xuất kho full-page (§5 design.md). Route: /inventory/issues/{new|:id|:id/edit}
export function GoodsIssueVoucherPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [sp] = useSearchParams()
  const category = (sp.get('category') as GoodsIssueCategory) ?? GoodsIssueCategory.Sales
  // Nhân bản: tạo mới nhưng nạp sẵn dữ liệu từ phiếu nguồn.
  const duplicateFromId = mode === 'new' ? sp.get('duplicateFrom') : null

  const close = useNavigateBack('/inventory')

  const { data: voucher } = useGoodsIssue(mode === 'new' ? null : (id ?? null))
  const { toast } = useToast()
  const setPosted = useSetGoodsIssuePosted()

  // Sửa nhanh: chuyển sang mode edit tại chỗ. Bỏ ghi/Ghi sổ: toggle trạng thái ghi sổ (đảo lại được).
  const quickEdit = () => id && navigate(`/inventory/issues/${id}/edit`)
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

  // Form tự dựng page header / action bar (§5 design.md) vì các control ở đó đọc-ghi
  // trực tiếp state form (lý do xuất, số phiếu, tổng tiền) → không bọc RecordPageShell.
  return (
    <GoodsIssueForm
      category={category}
      voucherId={id ?? null}
      duplicateFromId={duplicateFromId}
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
