import type { ComponentType, SVGProps } from 'react'
import type { Permission } from '@app/shared'

// Danh sách mục ở trang hub Thiết lập hệ thống + icon minh họa nhiều màu
// (kiểu MISA, cùng phong cách opening-balance-icons). Chỉ dùng trong feature này.

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const GREEN = '#43A047'
const GREEN_DARK = '#2E7D32'
const AMBER = '#FFB300'

function Svg({ size = 56, children, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" {...p}>
      {children}
    </svg>
  )
}

// Hai người (quản lý người dùng): người lớn xanh + badge người nhỏ vàng.
export const UsersSettingIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="20" cy="16" r="8" fill={GREEN} />
    <path d="M6 38a14 14 0 0 1 28 0v3H6z" fill={GREEN} />
    <path d="M6 38a14 14 0 0 1 28 0v3H6z" fill={GREEN_DARK} opacity=".25" />
    <circle cx="36" cy="31" r="9" fill={AMBER} />
    <circle cx="36" cy="28" r="3.2" fill="#fff" />
    <path d="M30.5 36.5a5.5 5.5 0 0 1 11 0z" fill="#fff" />
  </Svg>
)

export type SettingsItem = {
  to: string
  label: string
  icon: ComponentType<IconProps>
  permission: Permission
}

export const SETTINGS_ITEMS: SettingsItem[] = [
  { to: '/settings/users', label: 'Người dùng', icon: UsersSettingIcon, permission: 'users:read' },
]
