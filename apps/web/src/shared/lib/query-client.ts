import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from '@/shared/ui/toast'
import { getApiErrorMessage } from './api'

// Toast tự động theo meta của mutation — hook chỉ cần khai báo meta,
// không phải lặp toast({...}) ở từng component gọi mutate.
declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Tiêu đề toast thành công; dùng hàm khi message phụ thuộc kết quả/biến (vd Ghi sổ/Bỏ ghi). */
      success?: string | ((data: unknown, variables: unknown) => string)
      /** Tiêu đề toast lỗi (mô tả lấy từ getApiErrorMessage). CHỈ đặt khi component không tự toast/hiện lỗi — tránh báo lỗi 2 lần. */
      error?: string
    }
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  mutationCache: new MutationCache({
    onSuccess: (data, variables, _context, mutation) => {
      const success = mutation.meta?.success
      if (!success) return
      toast({
        variant: 'success',
        title: typeof success === 'function' ? success(data, variables) : success,
      })
    },
    onError: (error, _variables, _context, mutation) => {
      const title = mutation.meta?.error
      if (!title) return
      toast({ variant: 'error', title, description: getApiErrorMessage(error) })
    },
  }),
})
