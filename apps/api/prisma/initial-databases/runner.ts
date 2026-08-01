// Runner dùng chung cho mọi bộ dữ liệu khởi tạo (xem initial-databases/types.ts).
// Chỉ upsert / bỏ qua bản ghi trùng, KHÔNG truncate — chạy lại an toàn trên DB có dữ liệu.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { UserRole } from '@prisma/client'
import { hash } from 'bcryptjs'
import * as XLSX from 'xlsx'
import type { PrismaService } from '../../src/database/prisma.service'
import { BookLockService } from '../../src/modules/book-lock/book-lock.service'
import { OpeningBalanceService } from '../../src/modules/opening-balance/opening-balance.service'
import type { InitialDatabase } from './types'

const BCRYPT_ROUNDS = 10

function readDataFile(db: InitialDatabase, file: string) {
  return readFileSync(join(db.dir, 'data', file))
}

// Tài khoản đăng nhập (cột: Email | Tên | Vai trò | Trạng thái — vai trò là giá trị enum UserRole).
// Mật khẩu KHÔNG nằm trong file — mọi tài khoản dùng chung env INITIAL_DB_ADMIN_PASSWORD
// (giữ đọc SEED_ADMIN_PASSWORD cho môi trường đã cấu hình tên cũ).
async function importUsers(prisma: PrismaService, db: InitialDatabase) {
  if (!db.usersFile) return
  const password = process.env.INITIAL_DB_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? 'admin123'
  const passwordHash = await hash(password, BCRYPT_ROUNDS)

  const wb = XLSX.read(readDataFile(db, db.usersFile))
  const sheetName = wb.SheetNames[0]
  const sheet = sheetName ? wb.Sheets[sheetName] : undefined
  if (!sheet) throw new Error(`${db.usersFile}: file rỗng`)
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false })
  const headerIdx = rows.findIndex((r) => r.some((c) => String(c ?? '').trim().toLowerCase() === 'email'))
  if (headerIdx < 0) throw new Error(`${db.usersFile}: không tìm thấy hàng header có cột Email`)
  const header = rows[headerIdx]!.map((c) => String(c ?? '').trim().toLowerCase())
  const col = (name: string) => header.indexOf(name)
  const [iEmail, iName, iRole, iStatus] = [col('email'), col('tên'), col('vai trò'), col('trạng thái')]

  let count = 0
  for (const r of rows.slice(headerIdx + 1)) {
    const email = String(r[iEmail] ?? '').trim()
    const name = String(r[iName] ?? '').trim()
    if (!email || !name) continue
    const roleRaw = String(r[iRole] ?? '').trim().toUpperCase()
    const role = (Object.values(UserRole) as string[]).includes(roleRaw) ? (roleRaw as UserRole) : UserRole.VIEWER
    const isActive = !String(r[iStatus] ?? '').toLowerCase().includes('ngừng')
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash, name, role, isActive },
    })
    count++
  }
  console.log(`✓ Tài khoản người dùng: ${count}`)
}

// Nhập danh mục qua chính service importXlsx của module catalog — cùng logic với
// nhập Excel trên UI: dedup theo khóa tự nhiên, tự gán cha (cơ cấu tổ chức,
// hệ thống tài khoản, khoản mục chi phí).
async function importCatalogs(prisma: PrismaService, db: InitialDatabase) {
  for (const { label, file, service } of db.catalogs) {
    const buffer = readDataFile(db, file)
    const { created, skipped } = await service(prisma).importXlsx(buffer)
    console.log(`✓ ${label}: tạo ${created}, bỏ qua ${skipped}`)
  }
}

// Số dư tài khoản đầu kỳ, nhập qua chính importAccountBalancesXlsx — bỏ qua số TK
// đã có (idempotent). Chạy sau hệ thống tài khoản.
async function importAccountBalances(prisma: PrismaService, db: InitialDatabase) {
  if (!db.accountBalancesFile) return
  const service = new OpeningBalanceService(prisma, new BookLockService(prisma))
  const buffer = readDataFile(db, db.accountBalancesFile)
  const { created, skipped } = await service.importAccountBalancesXlsx(buffer)
  console.log(`✓ Số dư tài khoản: tạo ${created}, bỏ qua ${skipped}`)
}

export async function runInitialDatabase(prisma: PrismaService, db: InitialDatabase) {
  console.log(`🌱 Bộ dữ liệu: ${db.name} — ${db.description}`)
  await importUsers(prisma, db)
  await importCatalogs(prisma, db)
  await importAccountBalances(prisma, db)
}
