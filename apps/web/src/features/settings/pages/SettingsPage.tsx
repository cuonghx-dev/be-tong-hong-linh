import { Link } from 'react-router-dom'
import { useCan } from '@/features/auth'
import { SETTINGS_ITEMS } from '../settings-items'

// Trang hub Thiết lập hệ thống: lưới thẻ (cùng layout trang Nhập số dư ban đầu).
// Chỉ hiện thẻ mà vai trò hiện tại có quyền đọc.
export function SettingsPage() {
  const can = useCan()
  const items = SETTINGS_ITEMS.filter((it) => can(it.permission))
  return (
    <div className="px-6 py-5">
      <h1 className="text-2xl font-bold text-slate-800">Thiết lập hệ thống</h1>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-white px-4 py-10 text-center transition-shadow hover:shadow-md"
          >
            <item.icon size={56} />
            <span className="text-base font-semibold text-slate-800">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
