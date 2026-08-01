import type { CostVoucherOptionDto } from '@app/shared'
import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { formatCurrency } from '@/shared/lib/currency'
import { formatDate } from '@/shared/lib/report-period'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { useCostVouchers } from '../api/usePurchaseVouchers'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

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
        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo số chứng từ, nhà cung cấp…"
          autoFocus
          className="h-9 px-2 focus:border-primary/60"
        />
        <div className="max-h-80 overflow-y-auto rounded border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-2 py-1.5">Số chứng từ</TableHead>
                <TableHead className="px-2 py-1.5">Ngày hạch toán</TableHead>
                <TableHead className="px-2 py-1.5">Nhà cung cấp</TableHead>
                <TableHead className="px-2 py-1.5 text-right">Tổng chi phí</TableHead>
                <TableHead className="px-2 py-1.5 text-right">Đã phân bổ</TableHead>
                <TableHead className="px-2 py-1.5 text-right">Còn lại</TableHead>
                <TableHead className="w-16 px-2 py-1.5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {options.isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="px-2 py-4 text-center text-slate-500">
                    Đang tải…
                  </TableCell>
                </TableRow>
              )}
              {!options.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="px-2 py-4 text-center text-slate-500">
                    Không có chứng từ mua dịch vụ nào khả dụng.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((o) => {
                const remaining = Number(o.remaining)
                const exhausted = remaining <= 0
                return (
                  <TableRow key={o.id} className={cn('border-t border-border', exhausted && 'opacity-50')}>
                    <TableCell className="px-2 py-1.5 font-medium text-primary">{o.voucherNo}</TableCell>
                    <TableCell className="px-2 py-1.5">{formatDate(o.postingDate)}</TableCell>
                    <TableCell className="max-w-48 truncate px-2 py-1.5">{o.supplierName ?? ''}</TableCell>
                    <TableCell className="px-2 py-1.5 text-right tabular-nums">
                      {formatCurrency(Number(o.totalCost))}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-right tabular-nums">
                      {formatCurrency(Number(o.allocatedTotal))}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-right tabular-nums">
                      {formatCurrency(remaining)}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-center">
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
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </Modal>
  )
}
