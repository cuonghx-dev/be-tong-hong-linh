import { BankVoucherType } from '@app/shared'
import { useNavigate } from 'react-router-dom'
import {
  ProcessCardIcon,
  ProcessCompareIcon,
  ProcessDashboard,
  ProcessPeopleIcon,
  ProcessPersonBoxIcon,
  ProcessPersonIcon,
  ProcessReceiptIcon,
} from '@/shared/ui/process-dashboard'

// Tab "Quy trình" phân hệ Tiền gửi (§2.3 design.md).
export function BankProcessTab() {
  const navigate = useNavigate()
  const openNew = (type: BankVoucherType) => navigate(`/bank/vouchers/new?type=${type}`)

  return (
    <ProcessDashboard
      title="Nghiệp vụ tiền gửi"
      sources={[
        {
          label: 'Thu tiền',
          icon: <ProcessReceiptIcon kind="thu" motif="bank" />,
          onClick: () => openNew(BankVoucherType.Receipt),
        },
        {
          label: 'Chi tiền',
          icon: <ProcessReceiptIcon kind="chi" motif="bank" />,
          onClick: () => openNew(BankVoucherType.Payment),
        },
      ]}
      center={{ label: 'Đối chiếu ngân hàng', icon: <ProcessCompareIcon />, disabled: true }}
      shortcuts={[
        { label: 'Tài khoản ngân hàng', to: '/catalog/tai-khoan-ngan-hang', icon: <ProcessCardIcon /> },
        { label: 'Khách hàng', to: '/catalog/khach-hang', icon: <ProcessPersonIcon /> },
        { label: 'Nhà cung cấp', to: '/catalog/nha-cung-cap', icon: <ProcessPersonBoxIcon /> },
        { label: 'Nhân viên', to: '/catalog/nhan-vien', icon: <ProcessPeopleIcon /> },
      ]}
      reports={[
        'Bảng kê chứng từ theo khế ước cho vay',
        'Bảng kê chứng từ theo khế ước vay',
        'Bảng kê số dư ngân hàng',
        'Bảng kê số dư tiền theo ngày',
        'Báo cáo tổng hợp tình hình khế ước cho vay',
      ]}
    />
  )
}
