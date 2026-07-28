import { PartnerType } from '@app/shared'
import { useEffect, useState } from 'react'
import { useCreateEmployee, useOrganizationUnits } from '@/features/catalog'
import { getApiErrorMessage } from '@/shared/lib/api'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import type { PartnerOption } from '@/shared/ui/partner-picker'
import { useToast } from '@/shared/ui/toast'

interface Props {
  open: boolean
  onClose: () => void
  // Mã gõ dở ở picker → điền sẵn ô Mã nhân viên.
  initialCode?: string
  onCreated: (p: PartnerOption) => void
}

const empty = { code: '', name: '', title: '', department: '' }

// Tạo nhanh Nhân viên ngay trên form chứng từ — không rời trang.
export function QuickAddEmployeeDialog({ open, onClose, initialCode, onCreated }: Props) {
  const [form, setForm] = useState(empty)
  const create = useCreateEmployee()
  // Cơ cấu tổ chức cho combobox "Phòng ban".
  const orgUnits = useOrganizationUnits({ page: 1, pageSize: 200, isActive: true })
  const { toast } = useToast()

  useEffect(() => {
    if (open) setForm({ ...empty, code: initialCode ?? '' })
  }, [open, initialCode])

  const set =
    (k: keyof typeof empty) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast({ variant: 'error', title: 'Thiếu thông tin', description: 'Nhập Mã và Tên nhân viên.' })
      return
    }
    try {
      await create.mutateAsync({
        code: form.code.trim(),
        name: form.name.trim(),
        title: form.title.trim() || undefined,
        department: form.department.trim() || undefined,
      })
      onCreated({
        code: form.code.trim(),
        name: form.name.trim(),
        type: PartnerType.Employee,
        address: form.department.trim() || null,
      })
      onClose()
    } catch (e) {
      toast({ variant: 'error', title: 'Tạo nhân viên thất bại', description: getApiErrorMessage(e) })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Thêm nhân viên"
      footer={
        <>
          {/* Dialog render bên trong <form> chứng từ — thiếu type="button" sẽ kích submit form cha. */}
          <Button type="button" variant="outline" onClick={onClose} disabled={create.isPending}>
            Hủy
          </Button>
          <Button type="button" onClick={submit} disabled={create.isPending}>
            {create.isPending ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <L label="Mã nhân viên" required>
          <input value={form.code} onChange={set('code')} autoFocus className={cls} />
        </L>
        <L label="Tên nhân viên" required>
          <input value={form.name} onChange={set('name')} className={cls} />
        </L>
        <L label="Chức danh">
          <input value={form.title} onChange={set('title')} className={cls} />
        </L>
        <L label="Phòng ban">
          <select value={form.department} onChange={set('department')} className={cls}>
            <option value="">-- Chọn đơn vị --</option>
            {(orgUnits.data?.data ?? []).map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>
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
  className,
  children,
}: {
  label: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-[13px] font-semibold text-slate-800">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
