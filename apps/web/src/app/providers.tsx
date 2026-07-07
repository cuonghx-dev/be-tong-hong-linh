import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { queryClient } from '@/shared/lib/query-client'
import { ConfirmProvider } from '@/shared/ui/confirm-dialog'
import { ToastProvider } from '@/shared/ui/toast'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
