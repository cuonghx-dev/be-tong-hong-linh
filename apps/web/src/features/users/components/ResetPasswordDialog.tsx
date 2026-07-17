import type { UserListItem } from '@app/shared'
import { useEffect, useState } from 'react'
import { getApiErrorMessage } from '@/shared/lib/api'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { useToast } from '@/shared/ui/toast'
import { useUpdateUser } from '../api/useUserMutations'

interface Props {
  open: boolean
  onClose: () => void
  user: UserListItem | null
}

// Cấp lại mật khẩu — thao tác riêng, tách khỏi dialog sửa thông tin.
export function ResetPasswordDialog({ open, onClose, user }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const update = useUpdateUser()
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setPassword('')
      setConfirm('')
    }
  }, [open])

  const submit = async () => {
    if (password.length < 6) {
      toast({ variant: 'error', title: 'Mật khẩu quá ngắn', description: 'Tối thiểu 6 ký tự.' })
      return
    }
    if (password !== confirm) {
      toast({
        variant: 'error',
        title: 'Mật khẩu không khớp',
        description: 'Nhập lại mật khẩu giống ô trên.',
      })
      return
    }
    if (!user) return
    try {
      await update.mutateAsync({ id: user.id, dto: { password } })
      toast({ variant: 'success', title: 'Đã cấp lại mật khẩu', description: user.email })
      onClose()
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Cấp lại mật khẩu thất bại',
        description: getApiErrorMessage(e),
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={`Cấp lại mật khẩu — ${user?.email ?? ''}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={update.isPending}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={update.isPending}>
            {update.isPending ? 'Đang lưu…' : 'Cấp lại mật khẩu'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <L label="Mật khẩu mới" required>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className={cls}
          />
        </L>
        <L label="Nhập lại mật khẩu mới" required>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={cls}
          />
        </L>
      </div>
    </Modal>
  )
}

const cls =
  'h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm transition-colors hover:border-primary/50 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20'

function L({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-[13px] font-semibold text-slate-800">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
