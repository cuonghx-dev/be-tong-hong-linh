import type { BankAccountDto } from '@app/shared'
import { useEffect, useState } from 'react'
import { useBanks, useCreateBankAccount } from '@/features/catalog'
import { getApiErrorMessage } from '@/shared/lib/api'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { useToast } from '@/shared/ui/toast'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'

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
  // Danh mục ngân hàng cho combobox "Tên ngân hàng".
  const banks = useBanks({ page: 1, pageSize: 200, isActive: true })
  const { toast } = useToast()

  useEffect(() => {
    if (open) setForm({ ...empty, accountNumber: initialAccountNumber ?? '' })
  }, [open, initialAccountNumber])

  const set =
    (k: keyof typeof empty) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
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
        <Field label="Số tài khoản" required>
          <Input value={form.accountNumber} onChange={set('accountNumber')} autoFocus />
        </Field>
        <Field label="Tên ngân hàng" required>
          <Select
            value={form.bankName || undefined}
            onValueChange={(v) => setForm((f) => ({ ...f, bankName: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="-- Chọn ngân hàng --" />
            </SelectTrigger>
            <SelectContent>
              {(banks.data?.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.shortName}>
                  {b.shortName} - {b.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tên chi nhánh ngân hàng">
          <Input value={form.bankBranch} onChange={set('bankBranch')} />
        </Field>
        <Field label="Chủ tài khoản">
          <Input value={form.accountHolder} onChange={set('accountHolder')} />
        </Field>
      </div>
    </Modal>
  )
}
