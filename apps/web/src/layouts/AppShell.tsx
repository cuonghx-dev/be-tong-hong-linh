import type { PermissionDomain } from '@app/shared'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth, useCan } from '@/features/auth'
import { OnboardingModal, useOnboardingStore } from '@/features/onboarding'
import { cn } from '@/shared/lib/cn'
import { useUiStore } from '@/shared/lib/ui-store'
import {
  BankIcon,
  BellIcon,
  BookIcon,
  CartIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HelpIcon,
  HomeIcon,
  LayersIcon,
  PackageIcon,
  ReceiptIcon,
  SearchIcon,
  SettingsIcon,
  SigmaIcon,
  UserIcon,
  WalletIcon,
  type IconProps,
} from '@/shared/ui/icons'
import logoUrl from '@/assets/logo.png'
import { COMPANY_NAME } from '@/shared/lib/company'
import { Input } from '@/shared/ui/input'

type NavItem = {
  to: string
  label: string
  icon: (p: IconProps) => JSX.Element
  domain: PermissionDomain
}
type NavGroup = { title?: string; items: NavItem[] }

// Nhóm menu theo design.md §1.2 (mỗi nhóm: tiêu đề + list item).
// Mỗi item gắn domain phân quyền — chỉ hiện khi vai trò có quyền `<domain>:read`.
const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ to: '/', label: 'Tổng quan', icon: HomeIcon, domain: 'dashboard' }],
  },
  {
    title: 'Nghiệp vụ',
    items: [
      { to: '/cash', label: 'Tiền mặt', icon: WalletIcon, domain: 'cash' },
      { to: '/bank', label: 'Tiền gửi', icon: BankIcon, domain: 'bank' },
      { to: '/purchase', label: 'Mua hàng', icon: ReceiptIcon, domain: 'purchase' },
      { to: '/sales', label: 'Bán hàng', icon: CartIcon, domain: 'sales' },
      { to: '/inventory', label: 'Kho', icon: PackageIcon, domain: 'inventory' },
      { to: '/general', label: 'Tổng hợp', icon: SigmaIcon, domain: 'general' },
    ],
  },
  {
    title: 'Thiết lập',
    items: [
      { to: '/opening-balance', label: 'Số dư ban đầu', icon: BookIcon, domain: 'openingBalance' },
      { to: '/catalog', label: 'Danh mục', icon: LayersIcon, domain: 'catalog' },
    ],
  },
]

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const can = useCan()
  // Lọc menu theo quyền đọc từng domain; nhóm rỗng thì bỏ hẳn.
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => can(`${it.domain}:read`)),
  })).filter((g) => g.items.length > 0)
  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-border bg-white transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Brand — tên công ty */}
      <div className="flex h-14 items-center gap-2 px-4">
        <img src={logoUrl} alt={COMPANY_NAME} className="h-8 w-8 shrink-0 rounded-md" />
        {!collapsed && (
          <span className="text-xs font-bold leading-tight text-slate-800">{COMPANY_NAME}</span>
        )}
      </div>

      {/* Nav — theo nhóm; khi thu gọn thay tiêu đề nhóm bằng đường kẻ */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {groups.map((group, gi) => (
          <div key={group.title ?? gi} className={cn(gi > 0 && 'mt-2')}>
            {gi > 0 &&
              (collapsed ? (
                <div className="mx-2 mb-2 border-t border-border" />
              ) : (
                group.title && (
                  <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {group.title}
                  </div>
                )
              ))}
            {group.items.map(({ to, label, icon: Icon }) => (
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
          </div>
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
  const can = useCan()
  const openTutorial = useOnboardingStore((s) => s.setOpen)

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-white px-6">
      {/* Search trái */}
      <div className="relative mr-auto hidden w-full max-w-md md:block">
        <SearchIcon
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <Input
          placeholder="Tìm kiếm chứng từ, đối tượng…"
          className="h-9 bg-slate-50 pl-9 pr-3 focus:bg-white"
        />
      </div>

      {/* Utility phải */}
      <div className="ml-auto flex items-center gap-1">
        <button className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100">
          <BellIcon size={18} />
        </button>
        {/* Trợ giúp — mở lại tutorial "Bắt đầu sử dụng" (checklist thiết lập ban đầu) */}
        <button
          title="Bắt đầu sử dụng phần mềm"
          onClick={() => openTutorial(true)}
          className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
        >
          <HelpIcon size={18} />
        </button>
        {/* Cài đặt hệ thống (quản lý người dùng…) — không thuộc nghiệp vụ kế toán nên nằm ngoài sidebar */}
        {can('users:read') && (
          <button
            title="Cài đặt"
            onClick={() => navigate('/settings')}
            className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            <SettingsIcon size={18} />
          </button>
        )}
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
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800">
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      {/* Tutorial "Bắt đầu sử dụng" — tự bật lần đầu ở Tổng quan, mở lại bằng nút Trợ giúp */}
      <OnboardingModal />
    </div>
  )
}
