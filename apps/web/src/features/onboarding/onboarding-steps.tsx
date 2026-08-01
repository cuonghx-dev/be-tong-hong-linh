import {
  BankVoucherType,
  CashVoucherType,
  CHART_OF_ACCOUNTS,
  type OnboardingTaskKey,
  type Permission,
} from '@app/shared'
import {
  BookIcon,
  ChartIcon,
  LayersIcon,
  ReceiptIcon,
  UserIcon,
  type IconProps,
} from '@/shared/ui/icons'

// Cấu hình tutorial "Bắt đầu sử dụng" — 5 bước theo đúng phân hệ app đang có
// (tham chiếu bố cục MISA AMIS, không copy nội dung/màu).
// `key` khớp key trả về từ GET /dashboard/onboarding, trừ task `clientKey` (không suy được từ DB).

export interface OnboardingTask {
  /** Key tiến độ phía server; bỏ trống khi task đánh dấu ở client (xem báo cáo). */
  key?: OnboardingTaskKey
  /** Task chỉ theo dõi ở client (localStorage). */
  clientKey?: 'reportViewed'
  label: string
  /** Route "Làm ngay"; ẩn link nếu bỏ trống. */
  to: string
  /** Quyền cần có — thiếu quyền thì ẩn task khỏi cả tử số lẫn mẫu số. */
  permission: Permission
}

export interface OnboardingStep {
  key: string
  label: string
  icon: (p: IconProps) => JSX.Element
  /** Mô tả ngắn hiện ở đầu panel bên phải. */
  hint: string
  tasks: OnboardingTask[]
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: 'thiet-lap',
    label: 'Bước 1: Người dùng và thiết lập',
    icon: UserIcon,
    hint: 'Khai báo người dùng, nhân viên và cơ cấu tổ chức trước khi hạch toán.',
    tasks: [
      {
        key: 'users',
        label: 'Thêm người dùng và phân quyền',
        to: '/settings/users',
        permission: 'users:read',
      },
      {
        key: 'employees',
        label: 'Khai báo nhân viên',
        to: '/catalog/nhan-vien',
        permission: 'catalog:read',
      },
      {
        key: 'orgUnits',
        label: 'Khai báo cơ cấu tổ chức (phòng ban, chi nhánh)',
        to: '/catalog/co-cau-to-chuc',
        permission: 'catalog:read',
      },
    ],
  },
  {
    key: 'danh-muc',
    label: 'Bước 2: Khai báo danh mục',
    icon: LayersIcon,
    hint: 'Danh mục là dữ liệu nền của mọi chứng từ — khai báo đủ trước khi nhập số dư.',
    tasks: [
      {
        key: 'customers',
        label: 'Khai báo khách hàng',
        to: '/catalog/khach-hang',
        permission: 'catalog:read',
      },
      {
        key: 'suppliers',
        label: 'Khai báo nhà cung cấp',
        to: '/catalog/nha-cung-cap',
        permission: 'catalog:read',
      },
      {
        key: 'products',
        label: 'Khai báo vật tư hàng hóa',
        to: '/catalog/vat-tu-hang-hoa',
        permission: 'catalog:read',
      },
      { key: 'warehouses', label: 'Khai báo kho', to: '/catalog/kho', permission: 'catalog:read' },
      {
        key: 'bankAccounts',
        label: 'Khai báo tài khoản ngân hàng',
        to: '/catalog/tai-khoan-ngan-hang',
        permission: 'catalog:read',
      },
      {
        key: 'accounts',
        label: 'Kiểm tra hệ thống tài khoản',
        to: '/catalog/he-thong-tai-khoan',
        permission: 'catalog:read',
      },
    ],
  },
  {
    key: 'so-du',
    label: 'Bước 3: Nhập số dư ban đầu',
    icon: BookIcon,
    hint: 'Số dư tại thời điểm bắt đầu sử dụng phần mềm — nhập một lần, làm gốc cho báo cáo.',
    tasks: [
      {
        key: 'accountBalances',
        label: 'Số dư tài khoản',
        to: '/opening-balance/so-du-tai-khoan',
        permission: 'openingBalance:read',
      },
      {
        key: 'bankAccountBalances',
        label: 'Số dư tài khoản ngân hàng',
        to: `/opening-balance/so-du-tai-khoan/ngan-hang?account=${CHART_OF_ACCOUNTS.BANK_DEPOSIT}`,
        permission: 'openingBalance:read',
      },
      {
        key: 'receivableBalances',
        label: 'Công nợ khách hàng',
        to: `/opening-balance/so-du-tai-khoan/cong-no?account=${CHART_OF_ACCOUNTS.RECEIVABLE}`,
        permission: 'openingBalance:read',
      },
      {
        key: 'payableBalances',
        label: 'Công nợ nhà cung cấp',
        to: `/opening-balance/so-du-tai-khoan/cong-no?account=${CHART_OF_ACCOUNTS.PAYABLE}`,
        permission: 'openingBalance:read',
      },
      {
        key: 'inventoryBalances',
        label: 'Tồn kho vật tư, hàng hóa và CCDC',
        to: '/opening-balance/ton-kho-vat-tu-hang-hoa-ccdc',
        permission: 'openingBalance:read',
      },
      {
        key: 'fixedAssetBalances',
        label: 'Tài sản cố định đầu kỳ',
        to: '/opening-balance/tai-san-co-dinh-dau-ky',
        permission: 'openingBalance:read',
      },
    ],
  },
  {
    key: 'chung-tu',
    label: 'Bước 4: Lập chứng từ',
    icon: ReceiptIcon,
    hint: 'Hạch toán nghiệp vụ phát sinh hằng ngày — mỗi loại thử lập một chứng từ.',
    tasks: [
      {
        key: 'cashReceipt',
        label: 'Lập phiếu thu tiền mặt',
        to: `/cash/vouchers/new?type=${CashVoucherType.Receipt}`,
        permission: 'cash:write',
      },
      {
        key: 'cashPayment',
        label: 'Lập phiếu chi tiền mặt',
        to: `/cash/vouchers/new?type=${CashVoucherType.Payment}`,
        permission: 'cash:write',
      },
      {
        key: 'bankReceipt',
        label: 'Lập chứng từ thu tiền gửi',
        to: `/bank/vouchers/new?type=${BankVoucherType.Receipt}`,
        permission: 'bank:write',
      },
      {
        key: 'bankPayment',
        label: 'Lập ủy nhiệm chi (chi tiền gửi)',
        to: `/bank/vouchers/new?type=${BankVoucherType.Payment}`,
        permission: 'bank:write',
      },
      {
        key: 'purchaseVoucher',
        label: 'Lập chứng từ mua hàng',
        to: '/purchase/vouchers/new',
        permission: 'purchase:write',
      },
      {
        key: 'salesVoucher',
        label: 'Lập chứng từ bán hàng',
        to: '/sales/vouchers/new',
        permission: 'sales:write',
      },
      {
        key: 'inventoryReceipt',
        label: 'Lập phiếu nhập kho',
        to: '/inventory/receipts/new',
        permission: 'inventory:write',
      },
      {
        key: 'goodsIssue',
        label: 'Lập phiếu xuất kho',
        to: '/inventory/issues/new',
        permission: 'inventory:write',
      },
      {
        key: 'generalVoucher',
        label: 'Lập chứng từ nghiệp vụ khác',
        to: '/general/vouchers/new',
        permission: 'general:write',
      },
    ],
  },
  {
    key: 'bao-cao',
    label: 'Bước 5: Xem báo cáo',
    icon: ChartIcon,
    hint: 'Sổ sách và báo cáo lên tự động từ chứng từ đã ghi sổ.',
    tasks: [
      {
        clientKey: 'reportViewed',
        label: 'Xem sổ nhật ký chung và các báo cáo',
        to: '/general?tab=report',
        permission: 'general:read',
      },
    ],
  },
]
