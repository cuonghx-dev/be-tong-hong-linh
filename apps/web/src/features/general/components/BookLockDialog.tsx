import { useEffect, useState } from 'react'
import { getApiErrorMessage } from '@/shared/lib/api'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { useToast } from '@/shared/ui/toast'
import { useBookLock, useSetBookLock } from '../api/useBookLock'

// Dialog khóa sổ kỳ kế toán: chọn ngày khóa sổ — chứng từ có ngày hạch toán
// ≤ ngày này không được thêm/sửa/xóa (docs/tech.md).
export function BookLockDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast()
  const { data: lock } = useBookLock()
  const setLock = useSetBookLock()
  const [lockDate, setLockDate] = useState('')

  // Mở dialog → điền sẵn ngày khóa sổ hiện tại (nếu có).
  useEffect(() => {
    if (open) setLockDate(lock?.lockDate ?? '')
  }, [open, lock?.lockDate])

  const submit = async () => {
    if (!lockDate) {
      toast({ variant: 'error', title: 'Chưa chọn ngày khóa sổ' })
      return
    }
    try {
      const result = await setLock.mutateAsync({ lockDate })
      toast({
        variant: 'success',
        title: 'Đã khóa sổ',
        description: `Chứng từ có ngày hạch toán đến hết ${formatVn(result.lockDate)} không được thêm/sửa/xóa.`,
      })
      onClose()
    } catch (e) {
      toast({ variant: 'error', title: 'Khóa sổ thất bại', description: getApiErrorMessage(e) })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Khóa sổ kỳ kế toán"
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={setLock.isPending}>
            {setLock.isPending ? 'Đang khóa sổ…' : 'Khóa sổ'}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-700">
        <p>
          Trạng thái hiện tại:{' '}
          {lock?.lockDate ? (
            <span className="font-semibold">đã khóa sổ đến ngày {formatVn(lock.lockDate)}</span>
          ) : (
            <span className="font-semibold">chưa khóa sổ</span>
          )}
        </p>
        <label className="block">
          <span className="mb-1 block text-slate-500">Khóa sổ đến ngày</span>
          <input
            type="date"
            value={lockDate}
            onChange={(e) => setLockDate(e.target.value)}
            className="h-9 w-48 rounded-md border border-border px-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <p className="text-slate-500">
          Mọi chứng từ có ngày hạch toán từ ngày khóa sổ trở về trước sẽ không được thêm, sửa hoặc
          xóa cho tới khi bỏ khóa sổ.
        </p>
      </div>
    </Modal>
  )
}

function formatVn(iso: string | null) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
