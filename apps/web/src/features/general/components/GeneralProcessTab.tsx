import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '@/shared/lib/api'
import { useConfirm } from '@/shared/ui/confirm-dialog'
import {
  ProcessAccountTreeIcon,
  ProcessAdvanceSettleIcon,
  ProcessCostItemIcon,
  ProcessDashboard,
  ProcessFinReportIcon,
  ProcessGearIcon,
  ProcessLockBookIcon,
  ProcessOtherVoucherIcon,
  ProcessProfitTransferIcon,
  ProcessStatChartIcon,
  ProcessToolsIcon,
} from '@/shared/ui/process-dashboard'
import { useToast } from '@/shared/ui/toast'
import { useBookLock, useClearBookLock } from '../api/useBookLock'
import { BookLockDialog } from './BookLockDialog'

// Tab "Quy trình" phân hệ Tổng hợp (§2.3 design.md) — trục thời gian MISA.
export function GeneralProcessTab() {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { toast } = useToast()
  const { data: lock } = useBookLock()
  const clearLock = useClearBookLock()
  const [lockDialogOpen, setLockDialogOpen] = useState(false)

  const onClearLock = async () => {
    if (!lock?.lockDate) {
      toast({ variant: 'default', title: 'Chưa khóa sổ', description: 'Không có kỳ kế toán nào đang khóa.' })
      return
    }
    const ok = await confirm({
      title: 'Bỏ khóa sổ kỳ kế toán',
      description: `Cho phép thêm/sửa/xóa lại chứng từ có ngày hạch toán đến ${formatVn(lock.lockDate)}?`,
      confirmText: 'Bỏ khóa sổ',
    })
    if (!ok) return
    try {
      await clearLock.mutateAsync()
      toast({ variant: 'success', title: 'Đã bỏ khóa sổ kỳ kế toán' })
    } catch (e) {
      toast({ variant: 'error', title: 'Bỏ khóa sổ thất bại', description: getApiErrorMessage(e) })
    }
  }

  return (
    <>
      <ProcessDashboard
        title="Nghiệp vụ tổng hợp"
        timeline={[
          {
            top: { label: 'Quyết toán tạm ứng', icon: <ProcessAdvanceSettleIcon />, disabled: true },
            bottom: {
              label: 'Chứng từ nghiệp vụ khác',
              icon: <ProcessOtherVoucherIcon />,
              onClick: () => navigate('/general/vouchers/new'),
            },
          },
          {
            top: { label: 'Kết chuyển lãi lỗ', icon: <ProcessProfitTransferIcon />, disabled: true },
          },
          {
            top: {
              label: 'Khóa sổ kỳ kế toán',
              icon: <ProcessLockBookIcon />,
              menu: [
                { label: 'Khóa sổ kỳ kế toán', onClick: () => setLockDialogOpen(true) },
                { label: 'Bỏ khóa sổ kỳ kế toán', onClick: onClearLock },
              ],
            },
          },
          {
            bottom: { label: 'Lập báo cáo tài chính', icon: <ProcessFinReportIcon />, disabled: true },
          },
        ]}
        shortcuts={[
          { label: 'Hệ thống tài khoản', to: '/catalog/he-thong-tai-khoan', icon: <ProcessAccountTreeIcon /> },
          { label: 'Mã thống kê', icon: <ProcessStatChartIcon /> },
          { label: 'Khoản mục chi phí', to: '/catalog/khoan-muc-chi-phi', icon: <ProcessCostItemIcon /> },
          { label: 'Tiện ích', icon: <ProcessToolsIcon /> },
          { label: 'Tùy chọn', icon: <ProcessGearIcon /> },
        ]}
        reports={[
          'Sổ chi tiết các tài khoản',
          'Sổ nhật ký chung',
          'Tổng hợp công nợ nhân viên',
          'Tổng hợp công nợ theo đối tượng',
          'B01a-DNN: Báo cáo tình hình tài chính',
        ]}
      />
      <BookLockDialog open={lockDialogOpen} onClose={() => setLockDialogOpen(false)} />
    </>
  )
}

function formatVn(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
