import { useMemo, type ReactNode } from 'react'
import { toast as sonner } from 'sonner'
import { Toaster } from '@/shared/ui/sonner'

type ToastVariant = 'default' | 'success' | 'error'

interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

// Adapter mỏng trên sonner — giữ nguyên API `toast({ title, description, variant })`
// đang dùng ở ~50 file, nên không phải sửa call site khi đổi sang shadcn/sonner.
// Gọi được cả ngoài React (vd MutationCache trong query-client.ts).
export function toast({ title, description, variant = 'default', duration = 4000 }: ToastOptions) {
  const opts = { description, duration }
  if (variant === 'error') return sonner.error(title, opts)
  if (variant === 'success') return sonner.success(title, opts)
  return sonner(title, opts)
}

// Mount 1 lần ở gốc app.
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}

export function useToast() {
  return useMemo(() => ({ toast }), [])
}
