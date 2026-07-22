import type { FieldErrors } from 'react-hook-form'
import { z } from 'zod'

// Lấy message lỗi đầu tiên trong cây FieldErrors (đệ quy qua field lồng/mảng dòng)
// để hiện toast khi submit không hợp lệ — tránh trường hợp lỗi nằm ở field không có chỗ hiển thị.
export function firstFormError(errors: FieldErrors): string | undefined {
  for (const value of Object.values(errors)) {
    if (!value) continue
    if (typeof value.message === 'string' && value.message) return value.message
    if (typeof value === 'object') {
      const nested = firstFormError(value as FieldErrors)
      if (nested) return nested
    }
  }
  return undefined
}

// Handler cho handleSubmit(onValid, onInvalid): toast lỗi validate đầu tiên,
// tránh bấm Lưu mà không thấy phản hồi khi lỗi ở field không hiển thị message.
export function invalidToast(
  toast: (opts: { variant: 'error'; title: string; description?: string }) => void,
) {
  return (errors: FieldErrors) =>
    toast({
      variant: 'error',
      title: 'Dữ liệu chưa hợp lệ',
      description: firstFormError(errors) ?? 'Kiểm tra lại các trường bắt buộc.',
    })
}

// Enum optional trên form: Select/reset có thể đưa vào '' (chưa chọn) — coi như bỏ trống.
export function optionalEnum<T extends Record<string, string>>(e: T) {
  return z.preprocess((v) => (v === '' || v == null ? undefined : v), z.nativeEnum(e).optional())
}
