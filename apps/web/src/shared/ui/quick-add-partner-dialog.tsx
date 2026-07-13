import { CustomerType, PartnerType, SupplierType } from '@app/shared'
import { useEffect, useState } from 'react'
import { useCreateSupplier } from '@/features/purchase'
import { useCreateCustomer } from '@/features/sales'
import { getApiErrorMessage } from '@/shared/lib/api'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import type { PartnerOption } from '@/shared/ui/partner-picker'
import { useToast } from '@/shared/ui/toast'

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
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <L label={isSupplier ? 'Mã nhà cung cấp' : 'Mã đối tượng'} required>
          <input value={form.code} onChange={set('code')} autoFocus className={cls} />
        </L>
        <L label="Loại">
          <select value={form.type} onChange={set('type')} className={cls}>
            <option value="ORG">Tổ chức</option>
            <option value="INDIVIDUAL">Cá nhân</option>
          </select>
        </L>
        <L label={isSupplier ? 'Tên nhà cung cấp' : 'Tên đối tượng'} required className="sm:col-span-2">
          <input value={form.name} onChange={set('name')} className={cls} />
        </L>
        <L label="Mã số thuế">
          <input value={form.taxCode} onChange={set('taxCode')} className={cls} />
        </L>
        <L label="Điện thoại">
          <input value={form.phone} onChange={set('phone')} className={cls} />
        </L>
        <L label="Địa chỉ" className="sm:col-span-2">
          <input value={form.address} onChange={set('address')} className={cls} />
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
