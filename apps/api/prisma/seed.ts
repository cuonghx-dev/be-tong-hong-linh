// Seed dữ liệu ban đầu, toàn bộ đọc từ prisma/seed-data/*.xlsx:
// - Danh_sach_nguoi_dung.xlsx: tài khoản đăng nhập (mật khẩu qua env SEED_ADMIN_PASSWORD).
// - 14 file còn lại: bản sao spec MISA (repo be-tong-hong-linh @59fe1e0), nhập qua chính
//   service importXlsx của module catalog — cùng logic với nhập Excel trên UI: dedup theo
//   khóa tự nhiên, tự gán cha (cơ cấu tổ chức, hệ thống tài khoản, khoản mục chi phí).
// Chỉ upsert / bỏ qua bản ghi trùng, KHÔNG truncate — chạy lại an toàn trên DB có dữ liệu.
import 'reflect-metadata'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { UserRole } from '@prisma/client'
import { hash } from 'bcryptjs'
import * as XLSX from 'xlsx'
import { PrismaService } from '../src/database/prisma.service'
import { AccountService } from '../src/modules/catalog/account.service'
import { BankService } from '../src/modules/catalog/bank.service'
import { CostObjectService } from '../src/modules/catalog/cost-object.service'
import { DefaultAccountService } from '../src/modules/catalog/default-account.service'
import { ExpenseItemService } from '../src/modules/catalog/expense-item.service'
import { IncomeExpenseItemService } from '../src/modules/catalog/income-expense-item.service'
import { OrganizationUnitService } from '../src/modules/catalog/organization-unit.service'
import { OpeningBalanceService } from '../src/modules/opening-balance/opening-balance.service'
import { PartnerGroupService } from '../src/modules/catalog/partner-group.service'
import { ProductGroupService } from '../src/modules/catalog/product-group.service'
import { ProductService } from '../src/modules/catalog/product.service'
import { TransferAccountService } from '../src/modules/catalog/transfer-account.service'
import { UnitService } from '../src/modules/catalog/unit.service'
import { VoucherTypeService } from '../src/modules/catalog/voucher-type.service'
import { WarehouseService } from '../src/modules/catalog/warehouse.service'

const prisma = new PrismaService()

const BCRYPT_ROUNDS = 10

// Tài khoản đăng nhập từ seed-data/Danh_sach_nguoi_dung.xlsx
// (cột: Email | Tên | Vai trò | Trạng thái — vai trò là giá trị enum UserRole).
// Mật khẩu KHÔNG nằm trong file — mọi tài khoản seed dùng chung env SEED_ADMIN_PASSWORD.
async function seedAccounts() {
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'admin123'
  const passwordHash = await hash(password, BCRYPT_ROUNDS)

  const wb = XLSX.read(readFileSync(join(__dirname, 'seed-data', 'Danh_sach_nguoi_dung.xlsx')))
  const sheetName = wb.SheetNames[0]
  const sheet = sheetName ? wb.Sheets[sheetName] : undefined
  if (!sheet) throw new Error('Danh_sach_nguoi_dung.xlsx: file rỗng')
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false })
  const headerIdx = rows.findIndex((r) => r.some((c) => String(c ?? '').trim().toLowerCase() === 'email'))
  if (headerIdx < 0) throw new Error('Danh_sach_nguoi_dung.xlsx: không tìm thấy hàng header có cột Email')
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

// Thứ tự: cơ cấu tổ chức + hệ thống tài khoản trước để danh mục sau tham chiếu
// (kho → chi nhánh, TK kết chuyển/ngầm định → mã TK). Tham chiếu đều lỏng (không FK)
// nên sai thứ tự không vỡ, chỉ kém tự nhiên.
const CATALOG_IMPORTS: Array<{
  label: string
  file: string
  service: { importXlsx(buffer: Buffer): Promise<{ total: number; created: number; skipped: number }> }
}> = [
  { label: 'Cơ cấu tổ chức', file: 'Danh_sach_co_cau_to_chuc.xlsx', service: new OrganizationUnitService(prisma) },
  { label: 'Hệ thống tài khoản', file: 'Danh_sach_he_thong_tai_khoan_.xlsx', service: new AccountService(prisma) },
  { label: 'Tài khoản kết chuyển', file: 'Danh_sach_tai_khoan_ket_chuyen.xlsx', service: new TransferAccountService(prisma) },
  { label: 'Tài khoản ngầm định', file: 'Danh_sach_tai_khoan_ngam_dinh.xlsx', service: new DefaultAccountService(prisma) },
  { label: 'Kho', file: 'Danh_sach_kho.xlsx', service: new WarehouseService(prisma) },
  { label: 'Nhóm VTHH', file: 'Danh_sach_nhom_vat_tu_hang_hoa_dich_vu.xlsx', service: new ProductGroupService(prisma) },
  { label: 'Đơn vị tính', file: 'Danh_sach_don_vi_tinh.xlsx', service: new UnitService(prisma) },
  { label: 'Ngân hàng', file: 'Danh_sach_ngan_hang.xlsx', service: new BankService(prisma) },
  { label: 'Nhóm KH, NCC', file: 'Danh_sach_nhom_khach_hang_nha_cung_cap.xlsx', service: new PartnerGroupService(prisma) },
  { label: 'Khoản mục chi phí', file: 'Danh_sach_khoan_muc_chi_phi_.xlsx', service: new ExpenseItemService(prisma) },
  { label: 'Đối tượng tập hợp chi phí', file: 'Doi_tuong_tap_hop_chi_phi.xlsx', service: new CostObjectService(prisma) },
  { label: 'Vật tư hàng hóa', file: 'Danh_sach_hang_hoa_dich_vu.xlsx', service: new ProductService(prisma) },
  { label: 'Mục thu/chi', file: 'Danh_sach_muc_thuchi.xlsx', service: new IncomeExpenseItemService(prisma) },
  { label: 'Loại chứng từ', file: 'Danh_sach_loai_chung_tu.xlsx', service: new VoucherTypeService(prisma) },
]

async function seedCatalogsFromXlsx() {
  for (const { label, file, service } of CATALOG_IMPORTS) {
    const buffer = readFileSync(join(__dirname, 'seed-data', file))
    const { created, skipped } = await service.importXlsx(buffer)
    console.log(`✓ ${label}: tạo ${created}, bỏ qua ${skipped}`)
  }
}

// Số dư tài khoản đầu kỳ: 28 TK theo spec MISA, mọi số dư = 0 (Dư Nợ/Dư Có).
// Đọc từ seed-data/Danh_sach_so_du_tai_khoan.xlsx (bản zero hóa), nhập qua chính
// importAccountBalancesXlsx — bỏ qua số TK đã có (idempotent). Chạy sau hệ thống TK.
async function seedAccountBalances() {
  const service = new OpeningBalanceService(prisma)
  const buffer = readFileSync(join(__dirname, 'seed-data', 'Danh_sach_so_du_tai_khoan.xlsx'))
  const { created, skipped } = await service.importAccountBalancesXlsx(buffer)
  console.log(`✓ Số dư tài khoản (balance 0): tạo ${created}, bỏ qua ${skipped}`)
}

async function main() {
  await seedAccounts()
  await seedCatalogsFromXlsx()
  await seedAccountBalances()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
