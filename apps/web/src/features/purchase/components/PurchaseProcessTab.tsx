import { PurchaseVoucherType } from '@app/shared'
import { useNavigate } from 'react-router-dom'
import {
  ProcessCubeIcon,
  ProcessDashboard,
  ProcessPersonBoxIcon,
  ProcessReceiveGoodsIcon,
} from '@/shared/ui/process-dashboard'

// Tab "Quy trình" phân hệ Mua hàng (§2.3 design.md) — trục thời gian MISA,
// giản lược: chỉ giữ bước đã build (các bước Đơn mua hàng, Hóa đơn… chưa có).
export function PurchaseProcessTab() {
  const navigate = useNavigate()
  const openNew = (type: PurchaseVoucherType) => navigate(`/purchase/vouchers/new?type=${type}`)

  return (
    <ProcessDashboard
      title="Nghiệp vụ mua hàng"
      timeline={[
        {
          top: {
            label: 'Nhận hàng hóa, dịch vụ',
            icon: <ProcessReceiveGoodsIcon />,
            onClick: () => openNew(PurchaseVoucherType.Stock),
          },
        },
      ]}
      shortcuts={[
        { label: 'Nhà cung cấp', to: '/catalog/nha-cung-cap', icon: <ProcessPersonBoxIcon /> },
        { label: 'Hàng hóa, dịch vụ', to: '/catalog/vat-tu-hang-hoa', icon: <ProcessCubeIcon /> },
      ]}
      reports={[
        'Sổ chi tiết mua hàng',
        'Chi tiết công nợ phải trả nhà cung cấp',
        'Tổng hợp mua hàng theo mặt hàng',
        'Tổng hợp công nợ phải trả nhà cung cấp',
        'Biên bản đối chiếu và xác nhận công nợ phải trả',
      ]}
    />
  )
}
