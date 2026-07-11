// Danh sách nhóm danh mục hiển thị ở trang hub Danh mục (theo MISA).
// Mỗi item → route /catalog/:slug; trang chi tiết chưa build → placeholder.

export interface CatalogItem {
  slug: string
  label: string
}

export interface CatalogGroup {
  title: string
  items: CatalogItem[]
}

// Bố cục 3 cột như MISA: mỗi phần tử là 1 cột chứa nhiều nhóm.
export const CATALOG_COLUMNS: CatalogGroup[][] = [
  [
    {
      title: 'Đối tượng',
      items: [
        { slug: 'khach-hang', label: 'Khách hàng' },
        { slug: 'nha-cung-cap', label: 'Nhà cung cấp' },
        { slug: 'nhan-vien', label: 'Nhân viên' },
        { slug: 'nhom-khach-hang-nha-cung-cap', label: 'Nhóm khách hàng, nhà cung cấp' },
      ],
    },
    {
      title: 'Chi phí',
      items: [
        { slug: 'doi-tuong-tap-hop-chi-phi', label: 'Đối tượng tập hợp chi phí' },
        { slug: 'khoan-muc-chi-phi', label: 'Khoản mục chi phí' },
      ],
    },
  ],
  [
    {
      title: 'Vật tư hàng hóa',
      items: [
        { slug: 'vat-tu-hang-hoa', label: 'Vật tư hàng hóa' },
        { slug: 'kho', label: 'Kho' },
        { slug: 'nhom-vat-tu-hang-hoa-dich-vu', label: 'Nhóm vật tư, hàng hóa, dịch vụ' },
        { slug: 'don-vi-tinh', label: 'Đơn vị tính' },
      ],
    },
    {
      title: 'Ngân hàng',
      items: [
        { slug: 'ngan-hang', label: 'Ngân hàng' },
        { slug: 'tai-khoan-ngan-hang', label: 'Tài khoản ngân hàng' },
      ],
    },
  ],
  [
    {
      title: 'Tài khoản',
      items: [
        { slug: 'he-thong-tai-khoan', label: 'Hệ thống tài khoản' },
        { slug: 'tai-khoan-ket-chuyen', label: 'Tài khoản kết chuyển' },
        { slug: 'tai-khoan-ngam-dinh', label: 'Tài khoản ngầm định' },
      ],
    },
    {
      title: 'Khác',
      items: [
        { slug: 'muc-thu-chi', label: 'Mục thu/chi' },
        { slug: 'loai-chung-tu', label: 'Loại chứng từ' },
      ],
    },
  ],
]

// Tra label theo slug cho trang chi tiết.
export function findCatalogItem(slug: string): CatalogItem | undefined {
  for (const column of CATALOG_COLUMNS) {
    for (const group of column) {
      const item = group.items.find((i) => i.slug === slug)
      if (item) return item
    }
  }
  return undefined
}
