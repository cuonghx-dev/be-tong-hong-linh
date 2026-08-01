// Đăng ký bộ dữ liệu khởi tạo. Thêm bộ mới:
//   1. Tạo prisma/initial-databases/<ten-bo>/data/*.xlsx + database.ts (xem betonghonglinh).
//   2. Thêm vào INITIAL_DATABASES dưới đây.
// Chọn bộ khi chạy: INITIAL_DATABASE=<ten-bo> pnpm --filter @app/api prisma:initial-db
import { betonghonglinh } from './betonghonglinh/database'
import type { InitialDatabase } from './types'

export const INITIAL_DATABASES: InitialDatabase[] = [betonghonglinh]

export const DEFAULT_INITIAL_DATABASE = betonghonglinh.name

export function resolveInitialDatabase(name: string): InitialDatabase {
  const found = INITIAL_DATABASES.find((d) => d.name === name)
  if (!found) {
    const available = INITIAL_DATABASES.map((d) => d.name).join(', ')
    throw new Error(`Không tìm thấy bộ dữ liệu khởi tạo "${name}". Hiện có: ${available}`)
  }
  return found
}

export * from './types'
export { runInitialDatabase } from './runner'
