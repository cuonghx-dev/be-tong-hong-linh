import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth, useCan } from '@/features/auth'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { CheckIcon, ChevronRightIcon } from '@/shared/ui/icons'
import { Modal } from '@/shared/ui/modal'
import { useOnboardingProgress } from '../api/useOnboardingProgress'
import { ONBOARDING_STEPS, type OnboardingTask } from '../onboarding-steps'
import { useOnboardingStore } from '../store'

// Modal tutorial "Bắt đầu sử dụng" — checklist các bước thiết lập, tự tick theo dữ liệu thật.
// Render 1 lần ở AppShell: tự bật lần đầu ở trang Tổng quan, mở lại bằng nút Trợ giúp ở Header.
export function OnboardingModal() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const can = useCan()
  const userId = useAuth((s) => s.user?.id)

  const open = useOnboardingStore((s) => s.open)
  const setOpen = useOnboardingStore((s) => s.setOpen)
  const autoOpened = useOnboardingStore((s) => s.autoOpened)
  const markAutoOpened = useOnboardingStore((s) => s.markAutoOpened)
  const dismiss = useOnboardingStore((s) => s.dismiss)
  const dismissed = useOnboardingStore((s) => (userId ? !!s.dismissed[userId] : false))
  const reportViewed = useOnboardingStore((s) => (userId ? !!s.reportViewed[userId] : false))

  const { data, refetch } = useOnboardingProgress(!!userId && (!dismissed || open))
  const [activeKey, setActiveKey] = useState(ONBOARDING_STEPS[0]!.key)

  // Ẩn task ngoài quyền của vai trò → checklist vẫn có thể đạt 100%.
  const steps = useMemo(
    () =>
      ONBOARDING_STEPS.map((step) => {
        const tasks = step.tasks
          .filter((t) => can(t.permission))
          .map((t) => ({ ...t, done: isDone(t, data?.tasks, reportViewed) }))
        return { ...step, tasks, done: tasks.filter((t) => t.done).length }
      }).filter((step) => step.tasks.length > 0),
    [can, data, reportViewed],
  )

  const total = steps.reduce((n, s) => n + s.tasks.length, 0)
  const done = steps.reduce((n, s) => n + s.done, 0)
  const complete = total > 0 && done === total

  // Tự bật 1 lần mỗi phiên, chỉ ở trang Tổng quan và khi chưa thiết lập xong.
  useEffect(() => {
    if (!data || autoOpened || dismissed || complete || pathname !== '/') return
    markAutoOpened()
    setOpen(true)
  }, [data, autoOpened, dismissed, complete, pathname, markAutoOpened, setOpen])

  // Mở modal → refetch tiến độ (query mounted sẵn ở AppShell nên không tự refetch,
  // dữ liệu có thể đã đổi sau các thao tác trước đó) + nhảy tới bước dở dang đầu tiên.
  useEffect(() => {
    if (!open) return
    void refetch()
    const next = steps.find((s) => s.done < s.tasks.length) ?? steps[0]
    if (next) setActiveKey(next.key)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const active = steps.find((s) => s.key === activeKey) ?? steps[0]
  if (!open || !active) return null

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      size="xl"
      title="Bắt đầu sử dụng phần mềm"
      footer={
        <>
          {userId && (
            <Button variant="ghost" onClick={() => dismiss(userId)}>
              Không hiện lại
            </Button>
          )}
          <Button variant="outline" onClick={() => setOpen(false)}>
            Để sau
          </Button>
        </>
      }
    >
      {/* Tiến độ tổng */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="text-slate-600">
            {complete
              ? 'Đã hoàn tất thiết lập ban đầu.'
              : 'Thực hiện lần lượt các bước dưới đây để đưa dữ liệu vào phần mềm.'}
          </span>
          <span className="font-medium text-slate-700">
            {done}/{total} việc
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: total ? `${(done / total) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Cột trái — danh sách bước */}
        <div className="space-y-1.5">
          {steps.map((step) => {
            const stepDone = step.done === step.tasks.length
            const isActive = step.key === active.key
            return (
              <button
                key={step.key}
                onClick={() => setActiveKey(step.key)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  isActive
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-transparent hover:bg-slate-50',
                )}
              >
                <span
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-full',
                    stepDone ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500',
                  )}
                >
                  <step.icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {step.label}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      stepDone ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {stepDone && <CheckIcon size={12} />}
                    {stepDone ? 'Đã hoàn thành' : 'Hoàn thành'} {step.done}/{step.tasks.length}
                  </span>
                </span>
                <ChevronRightIcon
                  size={16}
                  className={isActive ? 'text-primary' : 'text-slate-300'}
                />
              </button>
            )
          })}
        </div>

        {/* Cột phải — việc cần làm của bước đang chọn */}
        <div className="rounded-lg border border-border">
          <div className="border-b border-border bg-slate-50 px-4 py-2.5">
            <div className="text-sm font-semibold text-slate-800">{active.label}</div>
            <p className="mt-0.5 text-xs text-slate-500">{active.hint}</p>
          </div>
          <ol className="divide-y divide-border">
            {active.tasks.map((task, i) => (
              <li key={task.key ?? task.clientKey} className="flex items-center gap-3 px-4 py-2.5">
                <span
                  className={cn(
                    'grid h-5 w-5 shrink-0 place-items-center rounded-full border text-white',
                    task.done ? 'border-primary bg-primary' : 'border-slate-300 bg-white',
                  )}
                >
                  {task.done && <CheckIcon size={12} />}
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 text-sm',
                    task.done ? 'text-slate-500' : 'text-slate-700',
                  )}
                >
                  {i + 1}. {task.label}
                </span>
                <Button variant="ghost" size="sm" onClick={() => go(task.to)}>
                  {task.done ? 'Xem lại' : 'Làm ngay'}
                  <ChevronRightIcon size={14} />
                </Button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Modal>
  )
}

// Task server đọc từ API; task client (xem báo cáo) đọc từ store.
function isDone(
  task: OnboardingTask,
  tasks: Record<string, boolean> | undefined,
  reportViewed: boolean,
): boolean {
  if (task.clientKey === 'reportViewed') return reportViewed
  return task.key ? !!tasks?.[task.key] : false
}
