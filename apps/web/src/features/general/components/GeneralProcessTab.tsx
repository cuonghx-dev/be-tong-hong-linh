import { useNavigate } from 'react-router-dom'
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

// Tab "Quy trình" phân hệ Tổng hợp (§2.3 design.md) — trục thời gian MISA.
export function GeneralProcessTab() {
  const navigate = useNavigate()

  return (
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
          top: { label: 'Khóa sổ kỳ kế toán', icon: <ProcessLockBookIcon />, disabled: true },
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
  )
}
