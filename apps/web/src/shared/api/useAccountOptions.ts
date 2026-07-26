import { useAccounts } from '@/features/catalog'

// Nguồn tài khoản cho AccountPicker (hệ thống tài khoản đang sử dụng).
// Danh mục nhỏ (~200 TK) nên tải 1 lần rồi lọc tại client; mọi picker chung 1 cache.
export function useAccountOptions() {
  const accounts = useAccounts({ page: 1, pageSize: 500, isActive: true })
  return { items: accounts.data?.data ?? [], loading: accounts.isLoading }
}
