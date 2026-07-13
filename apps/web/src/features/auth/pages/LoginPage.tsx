import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  BankIcon,
  CartIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  HelpIcon,
  PackageIcon,
  ReceiptIcon,
  SigmaIcon,
  WalletIcon,
} from '@/shared/ui/icons'
import { COMPANY_NAME } from '@/shared/lib/company'
import logoUrl from '@/assets/logo.png'
import { useLogin } from '../api/useLogin'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    login.mutate(
      { email, password },
      { onSuccess: () => navigate('/', { replace: true }) },
    )
  }

  const errorMessage = login.isError
    ? isAxiosError(login.error) && login.error.response?.status === 401
      ? 'Email hoặc mật khẩu không đúng'
      : 'Không thể đăng nhập. Vui lòng thử lại.'
    : null

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_30%,#e11d2e55,transparent_40%),radial-gradient(circle_at_80%_70%,#3b82f655,transparent_40%)]" />

      {/* Overlay top-right */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-3 text-sm text-white/80">
        <button className="flex items-center gap-1.5 hover:text-white">
          <span aria-hidden>🇻🇳</span> Việt Nam <ChevronDownIcon size={14} />
        </button>
        <span className="text-white/30">|</span>
        <button className="flex items-center gap-1 hover:text-white">
          <HelpIcon size={16} /> Trợ giúp
        </button>
      </div>

      {/* Card */}
      <div className="relative z-10 flex w-[860px] max-w-[94vw] overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Panel trái */}
        <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-gradient-to-b from-primary to-red-700 p-8 text-white md:flex">
          {/* Hoạ tiết nền */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border-[24px] border-white/10"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-white/[0.07]"
          />

          <div className="relative flex items-center gap-2.5">
            <img
              src={logoUrl}
              alt={COMPANY_NAME}
              className="h-9 w-9 shrink-0 rounded-lg bg-white/90 p-0.5"
            />
            <span className="text-sm font-bold leading-tight tracking-tight">{COMPANY_NAME}</span>
          </div>

          <div className="relative space-y-5">
            <h2 className="text-3xl font-bold leading-tight">
              QUẢN TRỊ
              <br />
              DOANH NGHIỆP
              <br />
              HỢP NHẤT
            </h2>
            {/* 4 phân hệ */}
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {[
                { icon: WalletIcon, label: 'Tiền mặt' },
                { icon: BankIcon, label: 'Tiền gửi' },
                { icon: ReceiptIcon, label: 'Mua hàng' },
                { icon: CartIcon, label: 'Bán hàng' },
                { icon: PackageIcon, label: 'Kho' },
                { icon: SigmaIcon, label: 'Tổng hợp' },
              ].map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 font-medium"
                >
                  <Icon size={16} className="shrink-0 text-white/80" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Mini bar chart trang trí */}
          <svg
            aria-hidden
            viewBox="0 0 120 48"
            className="relative h-12 w-28 text-white/40"
            fill="currentColor"
          >
            <rect x="0" y="30" width="12" height="18" rx="2" />
            <rect x="18" y="22" width="12" height="26" rx="2" />
            <rect x="36" y="26" width="12" height="22" rx="2" />
            <rect x="54" y="14" width="12" height="34" rx="2" />
            <rect x="72" y="18" width="12" height="30" rx="2" />
            <rect x="90" y="6" width="12" height="42" rx="2" className="text-white/70" />
          </svg>
        </aside>

        {/* Panel phải: form */}
        <section className="flex w-full flex-col p-8 md:w-[54%]">
          <div className="mb-6 flex items-center gap-2.5">
            <img src={logoUrl} alt={COMPANY_NAME} className="h-10 w-10 shrink-0 rounded-md" />
            <div className="min-w-0 truncate text-sm font-bold leading-tight text-primary">
              {COMPANY_NAME}
            </div>
          </div>
          <h1 className="mb-6 text-2xl font-semibold text-slate-800">Đăng nhập</h1>

          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="pr-10"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errorMessage && (
              <p className="text-sm text-red-600" role="alert">
                {errorMessage}
              </p>
            )}
            <Button type="submit" size="lg" className="mt-1 w-full" disabled={login.isPending}>
              {login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </Button>
          </form>

          <div className="mt-3 flex justify-between text-sm">
            {/* Chưa hỗ trợ — tài khoản do quản trị viên cấp. */}
            <span className="cursor-not-allowed text-slate-400" title="Sắp có">
              Quên mật khẩu?
            </span>
            <span className="cursor-not-allowed text-slate-400" title="Sắp có">
              Đăng ký
            </span>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 left-0 right-0 z-20 text-center text-xs text-white/60">
        Copyright © 2026 {COMPANY_NAME}
      </footer>
    </div>
  )
}
