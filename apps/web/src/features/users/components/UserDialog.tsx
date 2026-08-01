import { UserRole, USER_ROLE_LABELS, type UserListItem } from '@app/shared'
import { useEffect, useState } from 'react'
import { getApiErrorMessage } from '@/shared/lib/api'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useToast } from '@/shared/ui/toast'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
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
        <Field label="Email" required>
          <Input
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            disabled={!!user}
            autoFocus={!user}
            className={cn(user && 'bg-slate-50 text-slate-500 disabled:opacity-100')}
          />
        </Field>
        <Field label="Họ tên" required>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </Field>
        <Field label="Vai trò" required>
          <Select
            value={form.role}
            onValueChange={(v) => setForm((f) => ({ ...f, role: v as UserRole }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(UserRole).map((r) => (
                <SelectItem key={r} value={r}>
                  {USER_ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {!user && (
          <Field label="Mật khẩu" required>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </Field>
        )}
      </div>
    </Modal>
  )
}
