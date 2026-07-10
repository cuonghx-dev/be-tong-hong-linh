import type { ComponentType, SVGProps } from 'react'

// Icon minh họa nhiều màu (kiểu MISA) cho các thẻ ở trang hub Số dư ban đầu.
// Chỉ dùng trong feature này — icon line dùng chung vẫn ở shared/ui/icons.

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const GREEN = '#43A047'
const GREEN_DARK = '#2E7D32'
const AMBER = '#FFB300'
const AMBER_DARK = '#F57C00'

function Svg({ size = 56, children, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" {...p}>
      {children}
    </svg>
  )
}

// Tờ chứng từ xanh có ký hiệu $ — nền chung của nhiều icon.
function DollarDoc() {
  return (
    <>
      <rect x="8" y="4" width="24" height="34" rx="3" fill={GREEN} />
      <rect x="12" y="9" width="12" height="2.5" rx="1.25" fill="#fff" opacity=".9" />
      <rect x="12" y="14.5" width="16" height="2.5" rx="1.25" fill="#fff" opacity=".55" />
      <circle cx="17" cy="26" r="5.5" fill="#fff" opacity=".95" />
      <text x="17" y="29" textAnchor="middle" fontSize="9" fontWeight="700" fill={GREEN_DARK}>
        $
      </text>
    </>
  )
}

// Tờ chứng từ xanh có biểu đồ cột — nền chung của các icon công nợ.
function ChartDoc() {
  return (
    <>
      <rect x="8" y="4" width="24" height="34" rx="3" fill={GREEN} />
      <rect x="12" y="9" width="9" height="2.5" rx="1.25" fill="#fff" opacity=".9" />
      <rect x="12" y="14.5" width="13" height="2.5" rx="1.25" fill="#fff" opacity=".55" />
      <rect x="12" y="20" width="13" height="2.5" rx="1.25" fill="#fff" opacity=".55" />
      <rect x="23" y="9" width="2.5" height="7" rx="1" fill={AMBER} />
      <rect x="27" y="6.5" width="2.5" height="9.5" rx="1" fill="#fff" opacity=".9" />
    </>
  )
}

// Người (đầu + vai) trong vòng tròn — badge của các icon công nợ đối tượng.
function PersonBadge({ color }: { color: string }) {
  return (
    <>
      <circle cx="35" cy="31" r="9" fill={color} />
      <circle cx="35" cy="28" r="3.2" fill="#fff" />
      <path d="M29.5 36.5a5.5 5.5 0 0 1 11 0z" fill="#fff" />
    </>
  )
}

export const AccountBalanceIcon = (p: IconProps) => (
  <Svg {...p}>
    <DollarDoc />
    <rect x="22" y="27" width="20" height="13" rx="2" fill={AMBER} />
    <rect x="22" y="30" width="20" height="3.5" fill={AMBER_DARK} />
    <rect x="25" y="35.5" width="9" height="2.2" rx="1.1" fill="#fff" />
  </Svg>
)

export const BankBalanceIcon = (p: IconProps) => (
  <Svg {...p}>
    <DollarDoc />
    <path d="M37 22l10 6.5H27z" fill={AMBER} />
    <rect x="29" y="29.5" width="3" height="8" fill={AMBER_DARK} />
    <rect x="35.5" y="29.5" width="3" height="8" fill={AMBER_DARK} />
    <rect x="42" y="29.5" width="3" height="8" fill={AMBER_DARK} />
    <rect x="27" y="38.5" width="20" height="3" rx="1" fill={AMBER} />
  </Svg>
)

export const CustomerDebtIcon = (p: IconProps) => (
  <Svg {...p}>
    <ChartDoc />
    <PersonBadge color={AMBER} />
  </Svg>
)

export const SupplierDebtIcon = (p: IconProps) => (
  <Svg {...p}>
    <ChartDoc />
    <circle cx="41" cy="25" r="5" fill={AMBER_DARK} />
    <circle cx="41" cy="23.5" r="1.8" fill="#fff" />
    <path d="M38 28a3 3 0 0 1 6 0z" fill="#fff" />
    <PersonBadge color={AMBER} />
  </Svg>
)

export const EmployeeDebtIcon = (p: IconProps) => (
  <Svg {...p}>
    <ChartDoc />
    <PersonBadge color={AMBER_DARK} />
  </Svg>
)

export const InventoryOpeningIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 18L24 8l18 10v22H6z" fill={GREEN} />
    <path d="M6 18L24 8l18 10v4H6z" fill={GREEN_DARK} />
    <rect x="11" y="26" width="12" height="3" rx="1.5" fill="#fff" opacity=".9" />
    <rect x="29.5" y="23" width="7" height="7" rx="1" fill={AMBER} />
    <rect x="26" y="31" width="7" height="7" rx="1" fill={AMBER} />
    <rect x="33.5" y="31" width="7" height="7" rx="1" fill={AMBER_DARK} />
  </Svg>
)

export const ToolsInUseIcon = (p: IconProps) => (
  <Svg {...p}>
    <DollarDoc />
    <g transform="rotate(45 36 30)">
      <rect x="34.2" y="26" width="3.6" height="14" rx="1.8" fill={AMBER_DARK} />
      <circle cx="36" cy="24" r="5" fill={AMBER} />
      <circle cx="36" cy="24" r="2" fill="#fff" />
    </g>
  </Svg>
)

export const FixedAssetOpeningIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20L27 10l15 10v18H12z" fill={GREEN} />
    <path d="M12 20L27 10l15 10v4H12z" fill={GREEN_DARK} />
    <rect x="6" y="28" width="15" height="9" rx="1.5" fill={AMBER} />
    <path d="M21 31h5l3 3v3h-8z" fill={AMBER_DARK} />
    <circle cx="11" cy="38.5" r="2.5" fill={GREEN_DARK} />
    <circle cx="25" cy="38.5" r="2.5" fill={GREEN_DARK} />
  </Svg>
)

export const PrepaidExpenseIcon = (p: IconProps) => (
  <Svg {...p}>
    <DollarDoc />
    <rect x="22" y="28" width="20" height="12" rx="1.5" fill={AMBER} />
    <rect x="24.5" y="30.5" width="15" height="7" rx="1" fill={AMBER_DARK} opacity=".35" />
    <circle cx="32" cy="34" r="3" fill="#fff" />
  </Svg>
)

export const WipExpenseIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="10" y="4" width="24" height="36" rx="3" fill={GREEN} />
    <rect x="14" y="8" width="13" height="7" rx="1" fill={AMBER} />
    <text x="20.5" y="13.2" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="#fff">
      CHI
    </text>
    <rect x="14" y="19" width="14" height="2.5" rx="1.25" fill="#fff" opacity=".6" />
    <rect x="14" y="24" width="14" height="2.5" rx="1.25" fill="#fff" opacity=".6" />
    <circle cx="35" cy="34" r="6.5" fill={AMBER} />
    <circle cx="35" cy="34" r="4" fill={AMBER_DARK} opacity=".4" />
    <text x="35" y="36.8" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff">
      $
    </text>
  </Svg>
)

// Map slug (opening-balance-items.ts) → icon của thẻ.
export const OPENING_BALANCE_ICONS: Record<string, ComponentType<IconProps>> = {
  'so-du-tai-khoan': AccountBalanceIcon,
  'so-du-tk-ngan-hang': BankBalanceIcon,
  'cong-no-khach-hang': CustomerDebtIcon,
  'cong-no-nha-cung-cap': SupplierDebtIcon,
  'cong-no-nhan-vien': EmployeeDebtIcon,
  'ton-kho-vat-tu-hang-hoa-ccdc': InventoryOpeningIcon,
  'ccdc-dang-su-dung-dau-ky': ToolsInUseIcon,
  'tai-san-co-dinh-dau-ky': FixedAssetOpeningIcon,
  'chi-phi-tra-truoc-dau-ky': PrepaidExpenseIcon,
  'chi-phi-do-dang': WipExpenseIcon,
}
