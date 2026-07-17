// Query keys phân hệ người dùng.
export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
}
