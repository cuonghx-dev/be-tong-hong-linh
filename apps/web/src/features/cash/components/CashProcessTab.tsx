import { CashVoucherType } from '@app/shared'
import { useNavigate } from 'react-router-dom'
import {
  ProcessChecklistIcon,
  ProcessDashboard,
  ProcessGearIcon,
  ProcessPeopleIcon,
  ProcessPersonBoxIcon,
  ProcessPersonIcon,
  ProcessReceiptIcon,
} from '@/shared/ui/process-dashboard'

// Tab "Quy trình" phân hệ Tiền mặt (§2.3 design.md).
export function CashProcessTab() {
  const navigate = useNavigate()
  const openNew = (type: CashVoucherType) => navigate(`/cash/vouchers/new?type=${type}`)

  return (
    <ProcessDashboard
      title="Nghiệp vụ tiền mặt"
      sources={[
        {
          label: 'Thu tiền',
          icon: <ProcessReceiptIcon kind="thu" motif="cash" />,
          onClick: () => openNew(CashVoucherType.Receipt),
        },
        {
          label: 'Chi tiền',
          icon: <ProcessReceiptIcon kind="chi" motif="cash" />,
          onClick: () => openNew(CashVoucherType.Payment),
        },
      ]}
      center={{ label: 'Kiểm kê quỹ', icon: <ProcessChecklistIcon />, disabled: true }}
      shortcuts={[
        { label: 'Khách hàng', to: '/catalog/khach-hang', icon: <ProcessPersonIcon /> },
        { label: 'Nhà cung cấp', to: '/catalog/nha-cung-cap', icon: <ProcessPersonBoxIcon /> },
        { label: 'Nhân viên', to: '/catalog/nhan-vien', icon: <ProcessPeopleIcon /> },
        { label: 'Tùy chọn', icon: <ProcessGearIcon /> },
      ]}
      reports={[
        'Bảng kê số dư tiền theo ngày',
        'Dòng tiền',
        'S03a1-DNN: Sổ nhật ký thu tiền',
        'Sổ kế toán chi tiết quỹ tiền mặt',
        'S03a2-DNN: Sổ nhật ký chi tiền',
      ]}
    />
  )
}
