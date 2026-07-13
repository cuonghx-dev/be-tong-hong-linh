import type { BookLockDto, SetBookLockDto } from '@app/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { generalKeys } from './keys'

// Khóa sổ kỳ kế toán: chứng từ có ngày hạch toán ≤ ngày khóa sổ bị chặn thêm/sửa/xóa.
export function useBookLock() {
  return useQuery({
    queryKey: generalKeys.bookLock(),
    queryFn: () => api.get<BookLockDto>('/book-lock').then((r) => r.data),
  })
}

export function useSetBookLock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: SetBookLockDto) =>
      api.put<BookLockDto>('/book-lock', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: generalKeys.bookLock() })
    },
  })
}

export function useClearBookLock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete<BookLockDto>('/book-lock').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: generalKeys.bookLock() })
    },
  })
}
