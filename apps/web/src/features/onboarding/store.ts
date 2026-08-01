import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingState {
  /** Modal đang mở — trạng thái phiên, không persist. */
  open: boolean
  /** Đã tự bật 1 lần trong phiên này chưa (tránh bật lại mỗi lần quay về Tổng quan). */
  autoOpened: boolean
  /** userId → đã bấm "Không hiện lại". */
  dismissed: Record<string, boolean>
  /** userId → đã mở 1 báo cáo (bước 5 không suy được từ DB). */
  reportViewed: Record<string, boolean>
  setOpen: (open: boolean) => void
  markAutoOpened: () => void
  dismiss: (userId: string) => void
  markReportViewed: (userId: string) => void
}

// Trạng thái tutorial "Bắt đầu sử dụng" — theo userId để 2 người dùng chung máy không đè nhau.
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      open: false,
      autoOpened: false,
      dismissed: {},
      reportViewed: {},
      setOpen: (open) => set({ open }),
      markAutoOpened: () => set({ autoOpened: true }),
      dismiss: (userId) =>
        set((s) => ({ open: false, dismissed: { ...s.dismissed, [userId]: true } })),
      markReportViewed: (userId) =>
        set((s) =>
          s.reportViewed[userId] ? s : { reportViewed: { ...s.reportViewed, [userId]: true } },
        ),
    }),
    {
      name: 'ke-toan-onboarding',
      partialize: (s) => ({ dismissed: s.dismissed, reportViewed: s.reportViewed }),
    },
  ),
)
