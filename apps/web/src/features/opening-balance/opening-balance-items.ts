import { CHART_OF_ACCOUNTS } from '@app/shared'

// Danh sách nghiệp vụ nhập số dư ban đầu hiển thị ở trang hub (theo MISA).
// Mỗi item → route /opening-balance/:slug; item có `to` đi thẳng màn nhập đã build,
// còn lại trang chi tiết chưa build → placeholder.

export interface OpeningBalanceItem {
  slug: string
  label: string
  to?: string
}

export const OPENING_BALANCE_ITEMS: OpeningBalanceItem[] = [
  { slug: 'so-du-tai-khoan', label: 'Số dư tài khoản' },
  { slug: 'so-du-tk-ngan-hang', label: 'Số dư TK ngân hàng' },
  {
    slug: 'cong-no-khach-hang',
    label: 'Công nợ khách hàng',
    to: `/opening-balance/so-du-tai-khoan/cong-no?account=${CHART_OF_ACCOUNTS.RECEIVABLE}`,
  },
  {
    slug: 'cong-no-nha-cung-cap',
    label: 'Công nợ nhà cung cấp',
    to: `/opening-balance/so-du-tai-khoan/cong-no?account=${CHART_OF_ACCOUNTS.PAYABLE}`,
  },
  { slug: 'ton-kho-vat-tu-hang-hoa-ccdc', label: 'Tồn kho vật tư, hàng hóa và CCDC' },
  { slug: 'tai-san-co-dinh-dau-ky', label: 'Tài sản cố định đầu kỳ' },
]

export function findOpeningBalanceItem(slug: string): OpeningBalanceItem | undefined {
  return OPENING_BALANCE_ITEMS.find((item) => item.slug === slug)
}
