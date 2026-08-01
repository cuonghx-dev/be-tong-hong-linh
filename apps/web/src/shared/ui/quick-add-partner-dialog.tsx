import { CustomerType, PartnerType, SupplierType } from '@app/shared'
import { useEffect, useState } from 'react'
import { useCreateSupplier } from '@/features/purchase'
import { useCreateCustomer } from '@/features/sales'
import { getApiErrorMessage } from '@/shared/lib/api'
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
  // 'customer' → tạo Khách hàng, 'supplier' → tạo Nhà cung cấp.
  kind?: 'customer' | 'supplier'
  // Mã gõ dở ở picker → điền sẵn ô Mã đối tượng.
  initialCode?: string
  onCreated: (p: PartnerOption) => void
}

const empty = { code: '', name: '', type: 'ORG', taxCode: '', phone: '', address: '' }

// Tạo nhanh đối tượng (Khách hàng / Nhà cung cấp) ngay trên form chứng từ — không rời trang.
export function QuickAddPartnerDialog({ open, onClose, kind = 'customer', initialCode, onCreated }: Props) {
  const [form, setForm] = useState(empty)
  const createCustomer = useCreateCustomer()
  const createSupplier = useCreateSupplier()
  const { toast } = useToast()

  const isSupplier = kind === 'supplier'
  const create = isSupplier ? createSupplier : createCustomer
  const noun = isSupplier ? 'nhà cung cấp' : 'đối tượng'

  useEffect(() => {
    if (open) setForm({ ...empty, code: initialCode ?? '' })
  }, [open, initialCode])

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast({ variant: 'error', title: 'Thiếu thông tin', description: `Nhập Mã và Tên ${noun}.` })
      return
    }
    const base = {
      code: form.code.trim(),
      name: form.name.trim(),
      taxCode: form.taxCode.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
    }
    try {
      if (isSupplier) {
        await createSupplier.mutateAsync({ ...base, type: form.type as SupplierType })
      } else {
        await createCustomer.mutateAsync({ ...base, type: form.type as CustomerType })
      }
      onCreated({
        code: base.code,
        name: base.name,
        type: isSupplier ? PartnerType.Supplier : PartnerType.Customer,
        taxCode: base.taxCode ?? null,
        address: base.address ?? null,
        phone: base.phone ?? null,
      })
      onClose()
    } catch (e) {
      toast({ variant: 'error', title: `Tạo ${noun} thất bại`, description: getApiErrorMessage(e) })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isSupplier ? 'Thêm nhà cung cấp' : 'Thêm đối tượng'}
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
        <Field label={isSupplier ? 'Mã nhà cung cấp' : 'Mã đối tượng'} required>
          <Input value={form.code} onChange={set('code')} autoFocus />
        </Field>
        <Field label="Loại">
          <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ORG">Tổ chức</SelectItem>
              <SelectItem value="INDIVIDUAL">Cá nhân</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={isSupplier ? 'Tên nhà cung cấp' : 'Tên đối tượng'} required className="sm:col-span-2">
          <Input value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Mã số thuế">
          <Input value={form.taxCode} onChange={set('taxCode')} />
        </Field>
        <Field label="Điện thoại">
          <Input value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="Địa chỉ" className="sm:col-span-2">
          <Input value={form.address} onChange={set('address')} />
        </Field>
      </div>
    </Modal>
  )
}
