import type { BankAccountDto } from '@app/shared'
import { useEffect, useState } from 'react'
import { useCreateBankAccount } from '@/features/catalog'
import { getApiErrorMessage } from '@/shared/lib/api'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { useToast } from '@/shared/ui/toast'

interface Props {
  open: boolean
  onClose: () => void
  // Số TK gõ dở ở picker → điền sẵn ô Số tài khoản.
  initialAccountNumber?: string
  onCreated: (a: BankAccountDto) => void
}

const empty = { accountNumber: '', bankName: '', bankBranch: '', accountHolder: '' }

// Tạo nhanh Tài khoản ngân hàng ngay trên form chứng từ — không rời trang.
export function QuickAddBankAccountDialog({ open, onClose, initialAccountNumber, onCreated }: Props) {
  const [form, setForm] = useState(empty)
  const create = useCreateBankAccount()
  const { toast } = useToast()

  useEffect(() => {
    if (open) setForm({ ...empty, accountNumber: initialAccountNumber ?? '' })
  }, [open, initialAccountNumber])

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.accountNumber.trim() || !form.bankName.trim()) {
      toast({
        variant: 'error',
        title: 'Thiếu thông tin',
        description: 'Nhập Số tài khoản và Tên ngân hàng.',
      })
      return
    }
    try {
      const created = await create.mutateAsync({
        accountNumber: form.accountNumber.trim(),
        bankName: form.bankName.trim(),
        bankBranch: form.bankBranch.trim() || undefined,
        accountHolder: form.accountHolder.trim() || undefined,
      })
      onCreated(created)
      onClose()
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Tạo tài khoản ngân hàng thất bại',
        description: getApiErrorMessage(e),
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Thêm tài khoản ngân hàng"
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
        <L label="Số tài khoản" required>
          <input value={form.accountNumber} onChange={set('accountNumber')} autoFocus className={cls} />
        </L>
        <L label="Tên ngân hàng" required>
          <input value={form.bankName} onChange={set('bankName')} className={cls} />
        </L>
        <L label="Tên chi nhánh ngân hàng">
          <input value={form.bankBranch} onChange={set('bankBranch')} className={cls} />
        </L>
        <L label="Chủ tài khoản">
          <input value={form.accountHolder} onChange={set('accountHolder')} className={cls} />
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
