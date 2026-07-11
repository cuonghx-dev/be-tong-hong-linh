import { GoodsIssueCategory, InventoryReceiptType } from '@app/shared'
import { useNavigate } from 'react-router-dom'
import {
  ProcessAssemblyIcon,
  ProcessCubeIcon,
  ProcessDashboard,
  ProcessGearIcon,
  ProcessProductionOrderIcon,
  ProcessRulerIcon,
  ProcessStocktakeIcon,
  ProcessToolsIcon,
  ProcessTransferIcon,
  ProcessValuationIcon,
  ProcessWarehouseIcon,
  ProcessWarehouseInIcon,
  ProcessWarehouseOutIcon,
} from '@/shared/ui/process-dashboard'

// Tab "Quy trình" phân hệ Kho (§2.3 design.md) — trục thời gian MISA:
// nhánh nguồn Lệnh sản xuất / Lắp ráp gộp vào trục Xuất/Nhập/Chuyển kho…
export function InventoryProcessTab() {
  const navigate = useNavigate()
  const openReceipt = (type: InventoryReceiptType) =>
    navigate(`/inventory/receipts/new?type=${type}`)
  const openIssue = (category: GoodsIssueCategory) =>
    navigate(`/inventory/issues/new?category=${category}`)

  return (
    <ProcessDashboard
      title="Nghiệp vụ kho"
      timelineLead={{
        top: { label: 'Lệnh sản xuất', icon: <ProcessProductionOrderIcon />, disabled: true },
        bottom: { label: 'Lắp ráp, tháo dỡ', icon: <ProcessAssemblyIcon />, disabled: true },
      }}
      timeline={[
        {
          top: {
            label: 'Xuất kho',
            icon: <ProcessWarehouseOutIcon />,
            onClick: () => openIssue(GoodsIssueCategory.Sales),
          },
          bottom: {
            label: 'Nhập kho',
            icon: <ProcessWarehouseInIcon />,
            onClick: () => openReceipt(InventoryReceiptType.Purchase),
          },
        },
        {
          top: { label: 'Chuyển kho', icon: <ProcessTransferIcon />, disabled: true },
          bottom: { label: 'Tính giá xuất kho', icon: <ProcessValuationIcon />, disabled: true },
        },
        {
          bottom: { label: 'Kiểm kê', icon: <ProcessStocktakeIcon />, disabled: true },
        },
      ]}
      shortcuts={[
        { label: 'Kho', to: '/catalog/kho', icon: <ProcessWarehouseIcon /> },
        { label: 'Vật tư hàng hóa', to: '/catalog/vat-tu-hang-hoa', icon: <ProcessCubeIcon /> },
        { label: 'Đơn vị tính', to: '/catalog/don-vi-tinh', icon: <ProcessRulerIcon /> },
        { label: 'Tiện ích', icon: <ProcessToolsIcon /> },
        { label: 'Tùy chọn', icon: <ProcessGearIcon /> },
      ]}
      reports={[
        'Sổ chi tiết vật tư hàng hóa',
        'Tổng hợp tồn kho',
        'Báo cáo đối chiếu giá thành và giá trị nhập kho',
        'Báo cáo đối chiếu kho và sổ cái',
        'Báo cáo tiến độ sản xuất',
      ]}
    />
  )
}
