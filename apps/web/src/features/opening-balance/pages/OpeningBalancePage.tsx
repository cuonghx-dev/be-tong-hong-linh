import { BookIcon } from '@/shared/ui/icons'

// Placeholder — phân hệ Số dư ban đầu chưa build.
export function OpeningBalancePage() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid place-items-center rounded-lg border border-dashed border-border bg-white py-24 text-center">
        <BookIcon size={40} className="text-slate-300" />
        <div className="mt-3 text-lg font-semibold text-slate-700">Số dư ban đầu</div>
        <div className="mt-1 text-sm text-slate-500">Phân hệ đang phát triển.</div>
      </div>
    </div>
  )
}
