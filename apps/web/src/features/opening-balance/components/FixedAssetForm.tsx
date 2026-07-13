import { useState } from 'react'
import { CHART_OF_ACCOUNTS, type SaveFixedAssetOpeningBalanceLineInput } from '@app/shared'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { AmountInput } from './AmountInput'

// Giá trị 1 dòng TSCĐ đang soạn trong form (trùng payload lưu).
export type FixedAssetFormValue = SaveFixedAssetOpeningBalanceLineInput

// Loại tài sản (theo MISA) + TK nguyên giá mặc định tương ứng.
export const ASSET_TYPES: { label: string; account: string }[] = [
  { label: 'Nhà cửa, vật kiến trúc', account: CHART_OF_ACCOUNTS.FIXED_ASSET_BUILDINGS },
  { label: 'Máy móc, thiết bị', account: CHART_OF_ACCOUNTS.FIXED_ASSET_MACHINERY },
  { label: 'Phương tiện vận tải, truyền dẫn', account: CHART_OF_ACCOUNTS.FIXED_ASSET_VEHICLES },
  { label: 'Tài sản cố định khác', account: CHART_OF_ACCOUNTS.FIXED_ASSET },
]

interface Props {
  initial?: FixedAssetFormValue
  // Các mã tài sản đã tồn tại (trừ chính dòng đang sửa) — chặn trùng.
  existingCodes: string[]
  onSubmit: (value: FixedAssetFormValue) => void
  onCancel: () => void
}

const EMPTY: FixedAssetFormValue = {
  code: '',
  name: '',
  assetType: ASSET_TYPES[1]!.label, // Máy móc, thiết bị
  department: '',
  originalCost: 0,
  depreciableValue: 0,
  accumulatedDepreciation: 0,
  acquisitionDate: '',
  depreciationDate: '',
  usefulLifeMonths: 0,
  remainingMonths: 0,
  assetAccount: ASSET_TYPES[1]!.account,
  depreciationAccount: CHART_OF_ACCOUNTS.FIXED_ASSET_DEPRECIATION,
}

// Form 1 dòng TSCĐ đầu kỳ (mở trong Modal, gọi từ FixedAssetBalancePage).
export function FixedAssetForm({ initial, existingCodes, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState<FixedAssetFormValue>(initial ?? EMPTY)
  const [error, setError] = useState<string | null>(null)

  const patch = (p: Partial<FixedAssetFormValue>) => setValue((v) => ({ ...v, ...p }))

  // Đổi loại tài sản → gợi ý lại TK nguyên giá mặc định (vẫn sửa được).
  const changeType = (label: string) => {
    const type = ASSET_TYPES.find((t) => t.label === label)
    patch({ assetType: label, ...(type ? { assetAccount: type.account } : {}) })
  }

  // Nguyên giá thường = giá trị tính KH → nhập nguyên giá tự điền theo khi 2 số đang bằng nhau.
  const changeOriginalCost = (v: number) =>
    setValue((cur) => ({
      ...cur,
      originalCost: v,
      depreciableValue: cur.depreciableValue === cur.originalCost ? v : cur.depreciableValue,
    }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = value.code.trim()
    if (!code) return setError('Nhập mã tài sản.')
    if (existingCodes.includes(code)) return setError(`Mã tài sản ${code} đã tồn tại.`)
    if (!value.name.trim()) return setError('Nhập tên tài sản.')
    if (!value.acquisitionDate) return setError('Chọn ngày ghi tăng.')
    if (!value.assetAccount.trim()) return setError('Nhập TK nguyên giá.')
    if (!value.depreciationAccount.trim()) return setError('Nhập TK khấu hao.')
    setError(null)
    onSubmit({
      ...value,
      code,
      name: value.name.trim(),
      department: value.department.trim(),
      // Chưa chọn ngày tính KH → lấy theo ngày ghi tăng (như MISA).
      depreciationDate: value.depreciationDate || value.acquisitionDate,
      assetAccount: value.assetAccount.trim(),
      depreciationAccount: value.depreciationAccount.trim(),
    })
  }

  const label = 'mb-1 block text-sm font-medium text-slate-600'
  const field =
    'h-9 w-full rounded-md border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>
            Mã tài sản <span className="text-red-500">*</span>
          </label>
          <input
            value={value.code}
            onChange={(e) => patch({ code: e.target.value })}
            placeholder="vd TRAMTRON"
            className={field}
            autoFocus
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>
            Tên tài sản <span className="text-red-500">*</span>
          </label>
          <input
            value={value.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Tên tài sản"
            className={field}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Loại tài sản</label>
          <Select value={value.assetType} onValueChange={changeType}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSET_TYPES.map((t) => (
                <SelectItem key={t.label} value={t.label}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={label}>Đơn vị sử dụng</label>
          <input
            value={value.department}
            onChange={(e) => patch({ department: e.target.value })}
            placeholder="vd Bộ phận sản xuất"
            className={field}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>Nguyên giá</label>
          <AmountInput value={value.originalCost} onChange={changeOriginalCost} className="h-9" />
        </div>
        <div>
          <label className={label}>Giá trị tính KH</label>
          <AmountInput
            value={value.depreciableValue}
            onChange={(v) => patch({ depreciableValue: v })}
            className="h-9"
          />
        </div>
        <div>
          <label className={label}>Hao mòn lũy kế</label>
          <AmountInput
            value={value.accumulatedDepreciation}
            onChange={(v) => patch({ accumulatedDepreciation: v })}
            className="h-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div>
          <label className={label}>
            Ngày ghi tăng <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={value.acquisitionDate}
            onChange={(e) => patch({ acquisitionDate: e.target.value })}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Ngày tính KH</label>
          <input
            type="date"
            value={value.depreciationDate}
            onChange={(e) => patch({ depreciationDate: e.target.value })}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Thời gian SD (tháng)</label>
          <input
            type="number"
            min={0}
            step="any"
            value={value.usefulLifeMonths || ''}
            onChange={(e) => patch({ usefulLifeMonths: Number(e.target.value) || 0 })}
            placeholder="0"
            className={`${field} text-right tabular-nums`}
          />
        </div>
        <div>
          <label className={label}>SD còn lại (tháng)</label>
          <input
            type="number"
            min={0}
            step="any"
            value={value.remainingMonths || ''}
            onChange={(e) => patch({ remainingMonths: Number(e.target.value) || 0 })}
            placeholder="0"
            className={`${field} text-right tabular-nums`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>
            TK nguyên giá <span className="text-red-500">*</span>
          </label>
          <input
            value={value.assetAccount}
            onChange={(e) => patch({ assetAccount: e.target.value })}
            placeholder="vd 21112"
            className={`${field} tabular-nums`}
          />
        </div>
        <div>
          <label className={label}>
            TK khấu hao <span className="text-red-500">*</span>
          </label>
          <input
            value={value.depreciationAccount}
            onChange={(e) => patch({ depreciationAccount: e.target.value })}
            placeholder="vd 2141"
            className={`${field} tabular-nums`}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-md border border-border px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
        >
          Cất
        </button>
      </div>
    </form>
  )
}
