import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

interface ConfirmOptions {
  title: string
  description?: ReactNode
  confirmText?: string
  cancelText?: string
  destructive?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

// Provider dịch vụ xác nhận thay cho window.confirm. Dựng trên shadcn Dialog (Radix)
// → có focus trap, khóa scroll nền, Esc, portal.
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback<ConfirmFn>(
    (opts) => new Promise<boolean>((resolve) => setPending({ ...opts, resolve })),
    [],
  )

  const close = useCallback((ok: boolean) => {
    setPending((cur) => {
      cur?.resolve(ok)
      return null
    })
  }, [])

  const value = useMemo(() => confirm, [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog open={!!pending} onOpenChange={(v) => !v && close(false)}>
        <DialogContent
          role="alertdialog"
          className="max-w-md gap-0 border-border"
          // Enter = Đồng ý (nút xác nhận nhận focus khi mở).
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              close(true)
            }
          }}
        >
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-semibold text-slate-800">
              {pending?.title}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm text-slate-500">{pending?.description}</div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2 sm:space-x-0">
            <Button variant="outline" size="sm" onClick={() => close(false)}>
              {pending?.cancelText ?? 'Hủy'}
            </Button>
            <Button
              autoFocus
              variant={pending?.destructive ? 'destructive' : 'primary'}
              size="sm"
              onClick={() => close(true)}
            >
              {pending?.confirmText ?? 'Đồng ý'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm phải dùng trong <ConfirmProvider>')
  return ctx
}
