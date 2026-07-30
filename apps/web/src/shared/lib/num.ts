// Input number của React Hook Form trả về STRING cho tới khi zodResolver coerce,
// nên mọi phép cộng/tổng trên giá trị watch() phải ép số — không thì "0" + "1" = "01".
export function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
