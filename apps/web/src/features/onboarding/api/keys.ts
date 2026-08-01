export const onboardingKeys = {
  all: ['onboarding'] as const,
  progress: () => [...onboardingKeys.all, 'progress'] as const,
}
