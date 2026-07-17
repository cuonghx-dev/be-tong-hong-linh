import { UserRole, USER_ROLE_LABELS, type UserListItem } from '@app/shared'
import { useEffect, useState } from 'react'
import { getApiErrorMessage } from '@/shared/lib/api'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { useToast } from '@/shared/ui/toast'
import { useCreateUser, useUpdateUser } from '../api/useUserMutations'

interface Props {
  open: boolean
  onClose: () => void
  /** null = tạo mới; có giá trị = sửa. */
  user: UserListItem | null
}

const empty = { email: '', name: '', role: UserRole.KeToan, password: '' }

// Dialog tạo/sửa người dùng — sửa: email khóa, không đổi mật khẩu ở đây
// (cấp lại mật khẩu là thao tác riêng — ResetPasswordDialog).
export function UserDialog({ open, onClose, user }: Props) {
  const [form, setForm] = useState(empty)
  const create = useCreateUser()
  const update = useUpdateUser()
  const { toast } = useToast()
  const pending = create.isPending || update.isPending

  useEffect(() => {
    if (open) {
      setForm(user ? { email: user.email, name: user.name, role: user.role, password: '' } : empty)
    }
  }, [open, user])

  const submit = async () => {
    if (!form.email.trim() || !form.name.trim()) {
      toast({ variant: 'error', title: 'Thiếu thông tin', description: 'Nhập Email và Họ tên.' })
      return
    }
    if (!user && form.password.length < 6) {
      toast({ variant: 'error', title: 'Mật khẩu quá ngắn', description: 'Tối thiểu 6 ký tự.' })
      return
    }
    try {
      if (user) {
        await update.mutateAsync({
          id: user.id,
          dto: { name: form.name.trim(), role: form.role },
        })
      } else {
        await create.mutateAsync({
          email: form.email.trim(),
          name: form.name.trim(),
          role: form.role,
          password: form.password,
        })
      }
      onClose()
    } catch (e) {
      toast({
        variant: 'error',
        title: user ? 'Cập nhật thất bại' : 'Tạo người dùng thất bại',
        description: getApiErrorMessage(e),
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={user ? 'Sửa người dùng' : 'Thêm người dùng'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <L label="Email" required>
          <input
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            disabled={!!user}
            autoFocus={!user}
            className={cn(cls, user && 'bg-slate-50 text-slate-500')}
          />
        </L>
        <L label="Họ tên" required>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={cls}
          />
        </L>
        <L label="Vai trò" required>
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            className={cls}
          >
            {Object.values(UserRole).map((r) => (
              <option key={r} value={r}>
                {USER_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </L>
        {!user && (
          <L label="Mật khẩu" required>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className={cls}
            />
          </L>
        )}
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
