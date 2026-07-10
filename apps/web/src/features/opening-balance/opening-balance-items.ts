// Danh sách nghiệp vụ nhập số dư ban đầu hiển thị ở trang hub (theo MISA).
// Mỗi item → route /opening-balance/:slug; trang chi tiết chưa build → placeholder.

export interface OpeningBalanceItem {
  slug: string
  label: string
}

export const OPENING_BALANCE_ITEMS: OpeningBalanceItem[] = [
  { slug: 'so-du-tai-khoan', label: 'Số dư tài khoản' },
  { slug: 'so-du-tk-ngan-hang', label: 'Số dư TK ngân hàng' },
  { slug: 'cong-no-khach-hang', label: 'Công nợ khách hàng' },
  { slug: 'cong-no-nha-cung-cap', label: 'Công nợ nhà cung cấp' },
  { slug: 'cong-no-nhan-vien', label: 'Công nợ nhân viên' },
  { slug: 'ton-kho-vat-tu-hang-hoa-ccdc', label: 'Tồn kho vật tư, hàng hóa và CCDC' },
  { slug: 'ccdc-dang-su-dung-dau-ky', label: 'CCDC đang sử dụng đầu kỳ' },
  { slug: 'tai-san-co-dinh-dau-ky', label: 'Tài sản cố định đầu kỳ' },
  { slug: 'chi-phi-tra-truoc-dau-ky', label: 'Chi phí trả trước đầu kỳ' },
  { slug: 'chi-phi-do-dang', label: 'Chi phí dở dang' },
]

export function findOpeningBalanceItem(slug: string): OpeningBalanceItem | undefined {
  return OPENING_BALANCE_ITEMS.find((item) => item.slug === slug)
}
