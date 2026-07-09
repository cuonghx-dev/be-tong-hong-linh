// Placeholder cho tab phân hệ chưa build nội dung (Báo cáo, Quy trình…).
export function TabPlaceholder({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid place-items-center rounded-lg border border-dashed border-border bg-white py-24 text-center">
        <div className="text-lg font-semibold text-slate-700">{label}</div>
        <div className="mt-1 text-sm text-slate-500">Tính năng đang phát triển.</div>
      </div>
    </div>
  )
}
