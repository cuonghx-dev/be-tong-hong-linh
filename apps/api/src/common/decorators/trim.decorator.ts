import { Transform } from 'class-transformer'

// Trim chuỗi trước khi validate — mã/tên toàn dấu cách coi như rỗng (@IsNotEmpty chặn).
export const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
