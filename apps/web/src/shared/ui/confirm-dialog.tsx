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
import { Button } from '@/shared/ui/button'

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

// Provider dịch vụ xác nhận (shadcn AlertDialog-style) thay cho window.confirm.
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback<ConfirmFn>(
    (opts) => new Promise<boolean>((resolve) => setPending({ ...opts, resolve })),
    [],
  )

  const close = useCallback(
    (ok: boolean) => {
      setPending((cur) => {
        cur?.resolve(ok)
        return null
      })
    },
    [],
  )

  const value = useMemo(() => confirm, [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending && <ConfirmDialog pending={pending} onClose={close} />}
    </ConfirmContext.Provider>
  )
}

function ConfirmDialog({ pending, onClose }: { pending: Pending; onClose: (ok: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(false)
      if (e.key === 'Enter') onClose(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={() => onClose(false)}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="text-base font-semibold text-slate-800">{pending.title}</h2>
        {pending.description && (
          <div className="mt-2 text-sm text-slate-500">{pending.description}</div>
        )}
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onClose(false)}>
            {pending.cancelText ?? 'Hủy'}
          </Button>
          <Button
            ref={confirmRef}
            variant={pending.destructive ? 'destructive' : 'primary'}
            size="sm"
            onClick={() => onClose(true)}
          >
            {pending.confirmText ?? 'Đồng ý'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm phải dùng trong <ConfirmProvider>')
  return ctx
}
