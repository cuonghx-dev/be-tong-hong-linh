import { USER_ROLE_LABELS, type UserListItem } from '@app/shared'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { getApiErrorMessage } from '@/shared/lib/api'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { useConfirm } from '@/shared/ui/confirm-dialog'
import { ChevronLeftIcon, PlusIcon, RefreshIcon } from '@/shared/ui/icons'
import { RowActionMenu } from '@/shared/ui/row-action-menu'
import { useToast } from '@/shared/ui/toast'
import { useUsers } from '../api/useUsers'
import { useUpdateUser } from '../api/useUserMutations'
import { ResetPasswordDialog } from '../components/ResetPasswordDialog'
import { UserDialog } from '../components/UserDialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Badge } from '@/shared/ui/badge'

// Quản lý người dùng (chỉ ADMIN) — danh sách + tạo/sửa/khóa tài khoản.
export function UsersPage() {
  const { data: users, isLoading, isError, refetch, isFetching } = useUsers()
  const update = useUpdateUser()
  const currentUser = useAuth((s) => s.user)
  const [dialog, setDialog] = useState<{ open: boolean; user: UserListItem | null }>({
    open: false,
    user: null,
  })
  const [resetTarget, setResetTarget] = useState<UserListItem | null>(null)
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
    <div className="flex h-full flex-col px-6 py-5">
      <Link
        to="/settings"
        className="mb-2 flex w-fit items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeftIcon size={16} />
        Thiết lập hệ thống
      </Link>
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
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-slate-50 text-left text-[13px] text-slate-500">
              <TableHead className="font-medium">Email</TableHead>
              <TableHead className="font-medium">Họ tên</TableHead>
              <TableHead className="font-medium">Vai trò</TableHead>
              <TableHead className="font-medium">Trạng thái</TableHead>
              <TableHead className="text-center font-medium">Chức năng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-slate-400">
                  Đang tải…
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-red-500">
                  Tải danh sách thất bại.
                </TableCell>
              </TableRow>
            )}
            {users?.map((u) => (
              <TableRow key={u.id} className="border-b last:border-0">
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.name}</TableCell>
                <TableCell>{USER_ROLE_LABELS[u.role]}</TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? 'success' : 'muted'} className="font-medium">
                    {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <RowActionMenu
                    primaryLabel="Sửa"
                    onPrimary={() => setDialog({ open: true, user: u })}
                    items={[
                      { label: 'Cấp lại mật khẩu', onClick: () => setResetTarget(u) },
                      // Không cho tự khóa chính mình (API cũng chặn).
                      ...(u.id === currentUser?.id
                        ? []
                        : [
                            {
                              label: u.isActive ? 'Khóa tài khoản' : 'Mở khóa',
                              danger: u.isActive,
                              onClick: () => toggleActive(u),
                            },
                          ]),
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UserDialog
        open={dialog.open}
        user={dialog.user}
        onClose={() => setDialog({ open: false, user: null })}
      />
      <ResetPasswordDialog
        open={!!resetTarget}
        user={resetTarget}
        onClose={() => setResetTarget(null)}
      />
    </div>
  )
}
