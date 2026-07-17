import type { PermissionDomain } from '@app/shared'

// Suy domain phân quyền từ segment đầu của pathname — dùng cho các primitive
// dùng chung (AddMenu, RowActionMenu) tự ẩn theo quyền mà không cần prop ở mọi call site.
const DOMAIN_BY_SEGMENT: Record<string, PermissionDomain> = {
  cash: 'cash',
  bank: 'bank',
  purchase: 'purchase',
  sales: 'sales',
  inventory: 'inventory',
  general: 'general',
  catalog: 'catalog',
  'opening-balance': 'openingBalance',
  settings: 'users',
}

export function domainFromPath(pathname: string): PermissionDomain | undefined {
  const segment = pathname.split('/').filter(Boolean)[0]
  return segment ? DOMAIN_BY_SEGMENT[segment] : undefined
}
