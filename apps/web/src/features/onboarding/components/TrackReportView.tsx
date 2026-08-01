import { useEffect, type ReactNode } from 'react'
import { useAuth } from '@/features/auth'
import { useOnboardingStore } from '../store'

// Đánh dấu bước "Xem báo cáo" của tutorial khi user mở 1 trang báo cáo.
// Trang báo cáo là record route nằm NGOÀI AppShell nên phải bọc ở router, không hook được ở shell.
export function TrackReportView({ children }: { children: ReactNode }) {
  const userId = useAuth((s) => s.user?.id)
  const markReportViewed = useOnboardingStore((s) => s.markReportViewed)
  useEffect(() => {
    if (userId) markReportViewed(userId)
  }, [userId, markReportViewed])
  return <>{children}</>
}
