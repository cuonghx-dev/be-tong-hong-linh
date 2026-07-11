import { PurchaseVoucherType } from '@app/shared'
import { useNavigate } from 'react-router-dom'
import {
  ProcessContractIcon,
  ProcessCubeIcon,
  ProcessDashboard,
  ProcessGearIcon,
  ProcessInvoiceIcon,
  ProcessInvoiceInputIcon,
  ProcessPayInvoiceIcon,
  ProcessPersonBoxIcon,
  ProcessPurchaseDiscountIcon,
  ProcessPurchaseOrderIcon,
  ProcessPurchaseReturnIcon,
  ProcessReceiveGoodsIcon,
  ProcessToolsIcon,
} from '@/shared/ui/process-dashboard'

// Tab "Quy trình" phân hệ Mua hàng (§2.3 design.md) — trục thời gian MISA.
export function PurchaseProcessTab() {
  const navigate = useNavigate()
  const openNew = (type: PurchaseVoucherType) => navigate(`/purchase/vouchers/new?type=${type}`)

  return (
    <ProcessDashboard
      title="Nghiệp vụ mua hàng"
      timeline={[
        {
          top: { label: 'Đơn mua hàng', icon: <ProcessPurchaseOrderIcon />, disabled: true },
          bottom: { label: 'Hợp đồng mua hàng', icon: <ProcessContractIcon />, disabled: true },
        },
        {
          top: {
            label: 'Nhận hàng hóa, dịch vụ',
            icon: <ProcessReceiveGoodsIcon />,
            onClick: () => openNew(PurchaseVoucherType.Stock),
          },
          bottom: { label: 'Nhận hóa đơn', icon: <ProcessInvoiceIcon />, disabled: true },
        },
        {
          top: { label: 'Xử lý hóa đơn đầu vào', icon: <ProcessInvoiceInputIcon />, disabled: true },
          bottom: { label: 'Trả lại hàng mua', icon: <ProcessPurchaseReturnIcon />, disabled: true },
        },
        {
          top: { label: 'Trả tiền theo hóa đơn', icon: <ProcessPayInvoiceIcon />, disabled: true },
          bottom: { label: 'Giảm giá hàng mua', icon: <ProcessPurchaseDiscountIcon />, disabled: true },
        },
      ]}
      shortcuts={[
        { label: 'Nhà cung cấp', to: '/catalog/nha-cung-cap', icon: <ProcessPersonBoxIcon /> },
        { label: 'Hàng hóa, dịch vụ', to: '/catalog/vat-tu-hang-hoa', icon: <ProcessCubeIcon /> },
        { label: 'Tiện ích', icon: <ProcessToolsIcon /> },
        { label: 'Tùy chọn', icon: <ProcessGearIcon /> },
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
