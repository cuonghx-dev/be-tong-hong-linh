import { useParams, useSearchParams } from 'react-router-dom'
import { RecordPageShell } from '@/layouts/RecordPageShell'
import { useNavigateBack } from '@/shared/hooks/use-navigate-back'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { useGeneralVoucher, useNextGeneralVoucherNo } from '../api/useGeneralVouchers'
import { GeneralVoucherForm } from '../components/GeneralVoucherForm'

type Mode = 'new' | 'view' | 'edit'

// Trang chứng từ nghiệp vụ khác full-page (§5 design.md).
// Route: /general/vouchers/{new|:id|:id/edit}
export function GeneralVoucherPage({ mode }: { mode: Mode }) {
  const { id } = useParams()
  const [sp] = useSearchParams()
  // Nhân bản: tạo mới nhưng nạp sẵn dữ liệu từ chứng từ nguồn.
  const duplicateFromId = mode === 'new' ? sp.get('duplicateFrom') : null

  const close = useNavigateBack('/general')

  // Số chứng từ trên tiêu đề (MISA: "Chứng từ nghiệp vụ khác NVK272/2025").
  // Tạo mới → số dự kiến theo hôm nay (cùng query key với form → dùng chung cache).
  const detail = useGeneralVoucher(id ?? null)
  const nextNo = useNextGeneralVoucherNo(new Date().toISOString().slice(0, 10), mode === 'new')
  const voucherNo = mode === 'new' ? nextNo.data : detail.data?.voucherNo

  const base =
    mode === 'new'
      ? 'Chứng từ nghiệp vụ khác'
      : mode === 'edit'
        ? 'Sửa chứng từ nghiệp vụ khác'
        : 'Xem chứng từ nghiệp vụ khác'
  const heading = voucherNo ? `${base} ${voucherNo}` : base

  // Loại chứng từ NVK — hiện chỉ có "Khác" (MISA hiển thị combobox, danh sách 1 mục).
  // Chưa lưu vào DB: thêm cột category khi phát sinh loại thứ hai.
  const title = (
    <span className="flex items-center gap-3">
      {heading}
      <Select defaultValue="OTHER">
        <SelectTrigger
          aria-label="Loại chứng từ"
          className="h-8 w-auto gap-2 rounded-md border border-border bg-white px-2 text-sm font-normal text-slate-700"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="OTHER">Khác</SelectItem>
        </SelectContent>
      </Select>
    </span>
  )

  return (
    // Header nền primary nhạt liền khối với vùng thông tin chung của form (2 lớp màu, đồng bộ cash).
    <RecordPageShell
      title={title}
      onClose={close}
      headerClassName="border-b-0 bg-primary/5"
      contentClassName="p-0"
    >
      <GeneralVoucherForm
        voucherId={id ?? null}
        duplicateFromId={duplicateFromId}
        readOnly={mode === 'view'}
        onSaved={close}
        onCancel={close}
      />
    </RecordPageShell>
  )
}
