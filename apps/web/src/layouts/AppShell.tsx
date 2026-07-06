import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { useAuth } from '@/features/auth/store'
import {
  BankIcon,
  BellIcon,
  BuildingIcon,
  CartIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HelpIcon,
  HomeIcon,
  PackageIcon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
  WalletIcon,
  type IconProps,
} from '@/shared/ui/icons'
import { Button } from '@/shared/ui/button'

type NavItem = { to: string; label: string; icon: (p: IconProps) => JSX.Element }

const NAV: NavItem[] = [
  { to: '/', label: 'Trang chủ', icon: HomeIcon },
  { to: '/cash', label: 'Tiền mặt', icon: WalletIcon },
  { to: '/bank', label: 'Tiền gửi', icon: BankIcon },
  { to: '/purchase', label: 'Mua hàng', icon: ReceiptIcon },
  { to: '/sales', label: 'Bán hàng', icon: CartIcon },
  { to: '/inventory', label: 'Kho', icon: PackageIcon },
  { to: '/fixed-asset', label: 'Tài sản cố định', icon: BuildingIcon },
]

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-border bg-white transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-sm font-bold text-white">
          K
        </div>
        {!collapsed && <span className="font-bold text-slate-800">Kế toán SME</span>}
      </div>

      {/* Quick add */}
      <div className="px-3 pb-2">
        <Button className={cn('w-full', collapsed && 'px-0')} size="sm">
          <PlusIcon size={16} />
          {!collapsed && <span>Thêm nhanh</span>}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'mb-0.5 flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
                collapsed && 'justify-center',
                isActive
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-slate-600 hover:bg-slate-100',
              )
            }
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex h-11 items-center gap-2 border-t border-border px-4 text-sm text-slate-500 hover:bg-slate-50"
      >
        {collapsed ? <ChevronRightIcon size={18} /> : <ChevronLeftIcon size={18} />}
        {!collapsed && <span>Thu gọn</span>}
      </button>
    </aside>
  )
}

function Header() {
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-white px-4">
      {/* Context trái */}
      <button className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-slate-100">
        <div className="flex flex-col items-start leading-tight">
          <span className="font-medium text-slate-800">Công ty TNHH ABC</span>
          <span className="text-xs text-slate-400">Kỳ: 2026</span>
        </div>
        <ChevronDownIcon size={16} className="text-slate-400" />
      </button>

      {/* Search giữa */}
      <div className="relative mx-auto hidden w-full max-w-md md:block">
        <SearchIcon
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          placeholder="Tìm kiếm chứng từ, đối tượng…"
          className="h-9 w-full rounded-md border border-border bg-slate-50 pl-9 pr-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Utility phải */}
      <div className="ml-auto flex items-center gap-1">
        {[BellIcon, HelpIcon, SettingsIcon].map((Icon, i) => (
          <button
            key={i}
            className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            <Icon size={18} />
          </button>
        ))}
        <div className="group relative">
          <button className="ml-1 flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-100">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
              <UserIcon size={18} />
            </span>
            <span className="hidden text-sm text-slate-700 sm:block">{user?.name ?? 'User'}</span>
            <ChevronDownIcon size={14} className="text-slate-400" />
          </button>
          <div className="invisible absolute right-0 top-full z-30 mt-1 w-44 rounded-md border border-border bg-white py-1 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
            <div className="border-b border-border px-3 py-2 text-xs text-slate-400">
              {user?.email}
            </div>
            <button className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
              Tài khoản
            </button>
            <button
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
              className="block w-full px-3 py-2 text-left text-sm text-primary hover:bg-slate-50"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
