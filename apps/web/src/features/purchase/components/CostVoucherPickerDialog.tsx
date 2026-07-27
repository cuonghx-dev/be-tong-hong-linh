import type { CostVoucherOptionDto } from '@app/shared'
import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { formatCurrency } from '@/shared/lib/currency'
import { formatDate } from '@/shared/lib/report-period'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { useCostVouchers } from '../api/usePurchaseVouchers'

interface Props {
  open: boolean
  onClose: () => void
  // Id các chứng từ CP đã nằm trong bảng phân bổ — ẩn khỏi danh sách chọn.
  pickedIds: string[]
  onPick: (option: CostVoucherOptionDto) => void
}

// Dialog "Chọn chứng từ CP" (tab Chi phí, §10.4): liệt kê chứng từ mua dịch vụ
// đã ghi sổ kèm số còn được phân bổ; chọn 1 dòng → thêm vào bảng phân bổ.
export function CostVoucherPickerDialog({ open, onClose, pickedIds, onPick }: Props) {
  const [keyword, setKeyword] = useState('')
  const options = useCostVouchers(keyword, open)

  const rows = (options.data ?? []).filter((o) => !pickedIds.includes(o.id))

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Chọn chứng từ chi phí"
      footer={
        <Button variant="outline" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <div className="space-y-3">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo số chứng từ, nhà cung cấp…"
          autoFocus
          className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <div className="max-h-80 overflow-y-auto rounded border border-border">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-1.5">Số chứng từ</th>
                <th className="px-2 py-1.5">Ngày hạch toán</th>
                <th className="px-2 py-1.5">Nhà cung cấp</th>
                <th className="px-2 py-1.5 text-right">Tổng chi phí</th>
                <th className="px-2 py-1.5 text-right">Đã phân bổ</th>
                <th className="px-2 py-1.5 text-right">Còn lại</th>
                <th className="w-16 px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {options.isLoading && (
                <tr>
                  <td colSpan={7} className="px-2 py-4 text-center text-slate-500">
                    Đang tải…
                  </td>
                </tr>
              )}
              {!options.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-2 py-4 text-center text-slate-500">
                    Không có chứng từ mua dịch vụ nào khả dụng.
                  </td>
                </tr>
              )}
              {rows.map((o) => {
                const remaining = Number(o.remaining)
                const exhausted = remaining <= 0
                return (
                  <tr key={o.id} className={cn('border-t border-border', exhausted && 'opacity-50')}>
                    <td className="px-2 py-1.5 font-medium text-primary">{o.voucherNo}</td>
                    <td className="px-2 py-1.5">{formatDate(o.postingDate)}</td>
                    <td className="max-w-48 truncate px-2 py-1.5">{o.supplierName ?? ''}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {formatCurrency(Number(o.totalCost))}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {formatCurrency(Number(o.allocatedTotal))}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {formatCurrency(remaining)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={exhausted}
                        title={exhausted ? 'Đã phân bổ hết' : undefined}
                        onClick={() => onPick(o)}
                      >
                        Chọn
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}
