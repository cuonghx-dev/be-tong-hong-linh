import type { OnboardingProgressDto } from '@app/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { onboardingKeys } from './keys'

// Tiến độ thiết lập ban đầu — chỉ fetch khi modal mở (enabled) để không tốn query lúc vào app.
export function useOnboardingProgress(enabled: boolean) {
  return useQuery({
    queryKey: onboardingKeys.progress(),
    queryFn: () =>
      api.get<OnboardingProgressDto>('/dashboard/onboarding').then((r) => r.data),
    enabled,
    staleTime: 30_000,
  })
}
