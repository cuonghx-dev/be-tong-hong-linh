import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '@/shared/lib/cn'

type ToastVariant = 'default' | 'success' | 'error'

interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastItem extends Required<Omit<ToastOptions, 'description'>> {
  id: number
  description?: string
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// Cho phép bắn toast từ ngoài React (vd MutationCache trong query-client.ts).
// No-op khi ToastProvider chưa mount.
let dispatchToast: ((opts: ToastOptions) => void) | null = null

export function toast(opts: ToastOptions) {
  dispatchToast?.(opts)
}

const variantClass: Record<ToastVariant, string> = {
  default: 'border-border bg-white text-slate-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
}

const iconByVariant: Record<ToastVariant, string> = {
  default: 'ℹ',
  success: '✓',
  error: '✕',
}

// Provider + Toaster (shadcn/sonner-style). Mount 1 lần ở gốc app.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, description, variant = 'default', duration = 4000 }: ToastOptions) => {
      const id = ++seq.current
      setToasts((prev) => [...prev, { id, title, description, variant, duration }])
      window.setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  useEffect(() => {
    dispatchToast = toast
    return () => {
      dispatchToast = null
    }
  }, [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-lg',
              variantClass[t.variant],
            )}
          >
            <span className="mt-0.5 text-sm font-bold">{iconByVariant[t.variant]}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && <p className="mt-0.5 text-sm opacity-80">{t.description}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast phải dùng trong <ToastProvider>')
  return ctx
}
