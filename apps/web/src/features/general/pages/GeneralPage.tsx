import { SigmaIcon } from '@/shared/ui/icons'

// Placeholder — phân hệ Tổng hợp chưa build.
export function GeneralPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid place-items-center rounded-lg border border-dashed border-border bg-white py-24 text-center">
        <SigmaIcon size={40} className="text-slate-300" />
        <div className="mt-3 text-lg font-semibold text-slate-700">Tổng hợp</div>
        <div className="mt-1 text-sm text-slate-500">Phân hệ đang phát triển.</div>
      </div>
    </div>
  )
}
