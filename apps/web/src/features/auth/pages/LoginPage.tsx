import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ChevronDownIcon, EyeIcon, EyeOffIcon, HelpIcon } from '@/shared/ui/icons'
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
        <aside className="hidden w-[46%] flex-col justify-between bg-gradient-to-b from-primary to-red-700 p-8 text-white md:flex">
          <div className="text-xl font-bold tracking-tight">Kế toán SME</div>
          <div className="space-y-4">
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wider">
              NỀN TẢNG
            </span>
            <h2 className="text-3xl font-bold leading-tight">
              QUẢN TRỊ
              <br />
              DOANH NGHIỆP
              <br />
              HỢP NHẤT
            </h2>
            <p className="text-sm text-white/80">
              Kế toán · Bán hàng · Kho · Ngân hàng — trên một nền tảng.
            </p>
          </div>
          <div className="text-6xl">📊</div>
        </aside>

        {/* Panel phải: form */}
        <section className="flex w-full flex-col p-8 md:w-[54%]">
          <div className="mb-6 text-lg font-bold text-primary">Kế toán SME</div>
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
        Copyright © 2012 – 2026 Kế toán SME
      </footer>
    </div>
  )
}
