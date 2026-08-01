import type { UserListItem } from '@app/shared'
import { useEffect, useState } from 'react'
import { getApiErrorMessage } from '@/shared/lib/api'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { useToast } from '@/shared/ui/toast'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
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
        <Field label="Mật khẩu mới" required>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Nhập lại mật khẩu mới" required>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  )
}
