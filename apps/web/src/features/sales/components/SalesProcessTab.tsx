import { SalesVoucherType } from '@app/shared'
import { useNavigate } from 'react-router-dom'
import {
  ProcessCollectInvoiceIcon,
  ProcessCubeIcon,
  ProcessDashboard,
  ProcessPersonBoxIcon,
  ProcessRevenueIcon,
} from '@/shared/ui/process-dashboard'

// Tab "Quy trình" phân hệ Bán hàng (§2.3 design.md) — trục thời gian MISA,
// giản lược: chỉ giữ bước đã build (Báo giá, Đơn đặt hàng, Xuất hóa đơn… chưa có).
export function SalesProcessTab() {
  const navigate = useNavigate()
  const openNew = (type: SalesVoucherType) => navigate(`/sales/vouchers/new?type=${type}`)

  return (
    <ProcessDashboard
      title="Nghiệp vụ bán hàng"
      timeline={[
        {
          top: {
            label: 'Ghi nhận doanh thu',
            icon: <ProcessRevenueIcon />,
            onClick: () => openNew(SalesVoucherType.DomesticGoods),
          },
        },
        {
          top: {
            label: 'Thu tiền theo hóa đơn',
            icon: <ProcessCollectInvoiceIcon />,
            // Thu tiền đối trừ theo KH → mở tab Công nợ, bấm "Thu nợ" trên dòng KH.
            onClick: () => navigate('/sales?tab=debt'),
          },
        },
      ]}
      shortcuts={[
        { label: 'Khách hàng', to: '/catalog/khach-hang', icon: <ProcessPersonBoxIcon /> },
        { label: 'Hàng hóa, dịch vụ', to: '/catalog/vat-tu-hang-hoa', icon: <ProcessCubeIcon /> },
      ]}
      reports={[
        'Sổ chi tiết bán hàng',
        'Chi tiết công nợ phải thu khách hàng',
        'Tổng hợp bán hàng theo mặt hàng',
        'Tổng hợp công nợ phải thu khách hàng',
        'Báo cáo chi tiết lãi lỗ theo đơn hàng',
      ]}
    />
  )
}
