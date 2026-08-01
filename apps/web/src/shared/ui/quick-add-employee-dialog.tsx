import { PartnerType } from '@app/shared'
import { useEffect, useState } from 'react'
import { useCreateEmployee, useOrganizationUnits } from '@/features/catalog'
import { getApiErrorMessage } from '@/shared/lib/api'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import type { PartnerOption } from '@/shared/ui/partner-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { useToast } from '@/shared/ui/toast'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'

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
        <Field label="Mã nhân viên" required>
          <Input value={form.code} onChange={set('code')} autoFocus />
        </Field>
        <Field label="Tên nhân viên" required>
          <Input value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Chức danh">
          <Input value={form.title} onChange={set('title')} />
        </Field>
        <Field label="Phòng ban">
          <Select
            value={form.department || undefined}
            onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="-- Chọn đơn vị --" />
            </SelectTrigger>
            <SelectContent>
              {(orgUnits.data?.data ?? []).map((u) => (
                <SelectItem key={u.id} value={u.name}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </Modal>
  )
}
