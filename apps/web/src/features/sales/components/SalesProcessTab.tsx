import { SalesVoucherType } from '@app/shared'
import { useNavigate } from 'react-router-dom'
import {
  ProcessCollectInvoiceIcon,
  ProcessContractIcon,
  ProcessCubeIcon,
  ProcessDashboard,
  ProcessGearIcon,
  ProcessInvoiceIcon,
  ProcessPeopleIcon,
  ProcessPersonBoxIcon,
  ProcessQuotationIcon,
  ProcessRevenueIcon,
  ProcessSalesDiscountIcon,
  ProcessSalesOrderIcon,
  ProcessSalesReturnIcon,
  ProcessToolsIcon,
} from '@/shared/ui/process-dashboard'

// Tab "Quy trình" phân hệ Bán hàng (§2.3 design.md) — trục thời gian MISA.
export function SalesProcessTab() {
  const navigate = useNavigate()
  const openNew = (type: SalesVoucherType) => navigate(`/sales/vouchers/new?type=${type}`)

  return (
    <ProcessDashboard
      title="Nghiệp vụ bán hàng"
      // Nhánh nguồn bên trái: Báo giá / Đơn đặt hàng / Hợp đồng bán hàng gộp về đầu trục.
      timelineLead={{
        top: { label: 'Báo giá', icon: <ProcessQuotationIcon />, disabled: true },
        middle: { label: 'Đơn đặt hàng', icon: <ProcessSalesOrderIcon />, disabled: true },
        bottom: { label: 'Hợp đồng bán hàng', icon: <ProcessContractIcon />, disabled: true },
      }}
      timeline={[
        {
          top: {
            label: 'Ghi nhận doanh thu',
            icon: <ProcessRevenueIcon />,
            onClick: () => openNew(SalesVoucherType.DomesticGoods),
          },
          bottom: { label: 'Xuất hóa đơn', icon: <ProcessInvoiceIcon />, disabled: true },
        },
        {
          top: { label: 'Trả lại hàng bán', icon: <ProcessSalesReturnIcon />, disabled: true },
          bottom: { label: 'Giảm giá hàng bán', icon: <ProcessSalesDiscountIcon />, disabled: true },
        },
        {
          top: {
            label: 'Thu tiền theo hóa đơn',
            icon: <ProcessCollectInvoiceIcon />,
            disabled: true,
          },
        },
      ]}
      shortcuts={[
        { label: 'Khách hàng', to: '/catalog/khach-hang', icon: <ProcessPersonBoxIcon /> },
        { label: 'Hàng hóa, dịch vụ', to: '/catalog/vat-tu-hang-hoa', icon: <ProcessCubeIcon /> },
        { label: 'Điều khoản thanh toán', to: '/catalog/dieu-khoan-thanh-toan', icon: <ProcessPeopleIcon /> },
        { label: 'Tiện ích', icon: <ProcessToolsIcon /> },
        { label: 'Tùy chọn', icon: <ProcessGearIcon /> },
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
