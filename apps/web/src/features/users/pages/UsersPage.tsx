import { USER_ROLE_LABELS, type UserListItem } from '@app/shared'
import { useState } from 'react'
import { useAuth } from '@/features/auth'
import { getApiErrorMessage } from '@/shared/lib/api'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { useConfirm } from '@/shared/ui/confirm-dialog'
import { PlusIcon, RefreshIcon } from '@/shared/ui/icons'
import { RowActionMenu } from '@/shared/ui/row-action-menu'
import { useToast } from '@/shared/ui/toast'
import { useUsers } from '../api/useUsers'
import { useUpdateUser } from '../api/useUserMutations'
import { UserDialog } from '../components/UserDialog'

// Quản lý người dùng (chỉ ADMIN) — danh sách + tạo/sửa/khóa tài khoản.
export function UsersPage() {
  const { data: users, isLoading, isError, refetch, isFetching } = useUsers()
  const update = useUpdateUser()
  const currentUser = useAuth((s) => s.user)
  const [dialog, setDialog] = useState<{ open: boolean; user: UserListItem | null }>({
    open: false,
    user: null,
  })
  const { toast } = useToast()
  const confirm = useConfirm()

  const toggleActive = async (u: UserListItem) => {
    const lock = u.isActive
    if (
      lock &&
      !(await confirm({
        title: 'Khóa tài khoản',
        description: `Khóa tài khoản ${u.email}? Người dùng này sẽ không đăng nhập được nữa.`,
        confirmText: 'Khóa',
        destructive: true,
      }))
    )
      return
    try {
      await update.mutateAsync({ id: u.id, dto: { isActive: !u.isActive } })
      toast({
        variant: 'success',
        title: lock ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản',
        description: u.email,
      })
    } catch (e) {
      toast({ variant: 'error', title: 'Thao tác thất bại', description: getApiErrorMessage(e) })
    }
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-2">
        <h1 className="text-lg font-semibold text-slate-800">Người dùng</h1>
        <button
          onClick={() => refetch()}
          aria-label="Tải lại"
          className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100"
        >
          <RefreshIcon size={16} className={cn(isFetching && 'animate-spin')} />
        </button>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setDialog({ open: true, user: null })}>
            <PlusIcon size={16} />
            Thêm người dùng
          </Button>
        </div>
      </div>

      <div className="overflow-auto rounded-md border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-[13px] text-slate-500">
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Họ tên</th>
              <th className="px-3 py-2 font-medium">Vai trò</th>
              <th className="px-3 py-2 font-medium">Trạng thái</th>
              <th className="px-3 py-2 text-center font-medium">Chức năng</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-red-500">
                  Tải danh sách thất bại.
                </td>
              </tr>
            )}
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{USER_ROLE_LABELS[u.role]}</td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <RowActionMenu
                    primaryLabel="Sửa"
                    onPrimary={() => setDialog({ open: true, user: u })}
                    items={
                      // Không cho tự khóa chính mình (API cũng chặn).
                      u.id === currentUser?.id
                        ? []
                        : [
                            {
                              label: u.isActive ? 'Khóa tài khoản' : 'Mở khóa',
                              danger: u.isActive,
                              onClick: () => toggleActive(u),
                            },
                          ]
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UserDialog
        open={dialog.open}
        user={dialog.user}
        onClose={() => setDialog({ open: false, user: null })}
      />
    </div>
  )
}
