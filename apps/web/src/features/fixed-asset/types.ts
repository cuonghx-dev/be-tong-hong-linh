import { FixedAssetStatus } from '@app/shared'

// Nhãn hiển thị tình trạng sử dụng (cột "Tình trạng sử dụng" MISA).
export const FIXED_ASSET_STATUS_LABEL: Record<FixedAssetStatus, string> = {
  [FixedAssetStatus.InUse]: 'Đang sử dụng',
  [FixedAssetStatus.Suspended]: 'Ngừng sử dụng',
}

// Loại tài sản chuẩn MISA (dùng cho dropdown lọc). Cột "Loại tài sản" vẫn lưu tự do
// để nhận mọi giá trị khi nhập khẩu Excel.
export const ASSET_TYPE_OPTIONS = [
  'Nhà cửa, vật kiến trúc',
  'Máy móc, thiết bị',
  'Phương tiện vận tải, truyền dẫn',
  'Thiết bị, dụng cụ quản lý',
  'Tài sản cố định khác',
] as const
