// Điểm vào nạp dữ liệu khởi tạo: chọn 1 bộ trong prisma/initial-databases/ rồi chạy
// runner dùng chung. Mặc định betonghonglinh; đổi bằng env INITIAL_DATABASE hoặc
// tham số dòng lệnh: pnpm --filter @app/api prisma:initial-db -- --database=<ten-bo>
import 'reflect-metadata'
import { PrismaService } from '../src/database/prisma.service'
import { DEFAULT_INITIAL_DATABASE, resolveInitialDatabase, runInitialDatabase } from './initial-databases'

const prisma = new PrismaService()

function databaseName() {
  const arg = process.argv.find((a) => a.startsWith('--database='))
  return arg?.slice('--database='.length) || process.env.INITIAL_DATABASE || DEFAULT_INITIAL_DATABASE
}

async function main() {
  await runInitialDatabase(prisma, resolveInitialDatabase(databaseName()))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
