// Seed toàn bộ dữ liệu mẫu từ docs/misa-specs/*.xlsx (dữ liệu MISA xuất Excel).
// Bootstrap Nest ApplicationContext rồi gọi importXlsx của từng service — tái dùng
// nguyên logic nhập khẩu của app (map loại nghiệp vụ, TK ngầm định, bỏ trùng, chèn lô)
// nên seed idempotent: chạy lại chỉ thêm phần thiếu, không xóa dữ liệu có sẵn.
//
// Không seed: Hoa_don.xlsx (model hóa đơn đã bỏ — trạng thái lập HĐ nằm trong chứng từ
// bán hàng), Lenh_san_xuat.xlsx (model lệnh sản xuất đã bỏ).
//
// Chạy: pnpm --filter @app/api seed
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NestFactory } from '@nestjs/core'
import { hashSync } from 'bcryptjs'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/database/prisma.service'
import { BankService } from '../src/modules/bank/bank.service'
import { CashService } from '../src/modules/cash/cash.service'
import { AccountService } from '../src/modules/catalog/account.service'
import { BankAccountService } from '../src/modules/catalog/bank-account.service'
import { BankService as CatalogBankService } from '../src/modules/catalog/bank.service'
import { CostObjectService } from '../src/modules/catalog/cost-object.service'
import { DefaultAccountService } from '../src/modules/catalog/default-account.service'
import { EmployeeService } from '../src/modules/catalog/employee.service'
import { ExpenseItemService } from '../src/modules/catalog/expense-item.service'
import { IncomeExpenseItemService } from '../src/modules/catalog/income-expense-item.service'
import { PartnerGroupService } from '../src/modules/catalog/partner-group.service'
import { ProductGroupService } from '../src/modules/catalog/product-group.service'
import { ProductService } from '../src/modules/catalog/product.service'
import { TransferAccountService } from '../src/modules/catalog/transfer-account.service'
import { UnitService } from '../src/modules/catalog/unit.service'
import { VoucherTypeService } from '../src/modules/catalog/voucher-type.service'
import { WarehouseService } from '../src/modules/catalog/warehouse.service'
import { OrganizationUnitService } from '../src/modules/catalog/organization-unit.service'
import { GeneralService } from '../src/modules/general/general.service'
import { GoodsIssueService } from '../src/modules/inventory/goods-issue.service'
import { ReceiptService } from '../src/modules/inventory/receipt.service'
import { OpeningBalanceService } from '../src/modules/opening-balance/opening-balance.service'
import { PurchaseService } from '../src/modules/purchase/purchase.service'
import { SupplierService } from '../src/modules/purchase/supplier.service'
import { CustomerService } from '../src/modules/sales/customer.service'
import { SalesService } from '../src/modules/sales/sales.service'
import { enrichSeed } from './seed-enrich'

const MISA_DIR = join(__dirname, '../../../docs/misa-specs')

function xlsx(file: string): Buffer {
  return readFileSync(join(MISA_DIR, file))
}

// Kết quả importXlsx chung của các service: { total, created, skipped }.
interface ImportResult {
  total: number
  created: number
  skipped: number
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  })

  try {
    const prisma = app.get(PrismaService)

    // ── Reset dữ liệu nghiệp vụ (SEED_RESET=1) — xóa sạch để seed lại giống thật ──
    // Giữ bảng users (tài khoản đăng nhập). TRUNCATE ... CASCADE gỡ mọi ràng buộc FK.
    if (process.env.SEED_RESET === '1') {
      const tables = [
        'cash_voucher_lines', 'cash_vouchers',
        'bank_voucher_lines', 'bank_vouchers',
        'purchase_voucher_lines', 'purchase_vouchers',
        'sales_voucher_lines', 'sales_vouchers',
        'inventory_receipt_lines', 'inventory_receipts',
        'goods_issue_lines', 'goods_issue_vouchers',
        'general_voucher_lines', 'general_vouchers',
        'suppliers', 'customers',
        'account_opening_balances', 'partner_opening_balances',
        'fixed_asset_opening_balances', 'bank_account_opening_balances',
        'inventory_opening_balances',
        'products', 'warehouses', 'employees', 'partner_groups', 'product_groups',
        'bank_accounts', 'expense_items', 'accounts', 'cost_objects',
        'income_expense_items', 'banks', 'transfer_accounts', 'default_accounts',
        'voucher_types', 'units', 'book_locks', 'organization_units',
      ]
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
      )
      console.log(`Reset: đã xóa ${tables.length} bảng (giữ users).`)
    }

    // ── Người dùng quản trị (auth) — mật khẩu đặt qua env SEED_ADMIN_PASSWORD ──
    const email = 'admin@ketoan.vn'
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: hashSync(process.env.SEED_ADMIN_PASSWORD ?? 'admin123', 10),
        name: 'Quản trị viên',
        role: 'ADMIN',
      },
    })
    console.log(`Người dùng: ${email} (ADMIN)`)

    // ── User mẫu mỗi vai trò — test phân quyền nhanh (mật khẩu như admin) ──
    const sampleUsers = [
      { email: 'ketoan@ketoan.vn', name: 'Kế toán', role: 'KETOAN' },
      { email: 'thuquy@ketoan.vn', name: 'Thủ quỹ', role: 'THUQUY' },
      { email: 'viewer@ketoan.vn', name: 'Giám đốc', role: 'VIEWER' },
    ] as const
    for (const u of sampleUsers) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          email: u.email,
          passwordHash: hashSync(process.env.SEED_ADMIN_PASSWORD ?? 'admin123', 10),
          name: u.name,
          role: u.role,
        },
      })
      console.log(`Người dùng: ${u.email} (${u.role})`)
    }

    const openingBalance = app.get(OpeningBalanceService)

    // Thứ tự theo phụ thuộc: danh mục → đối tượng (KH/NCC) → số dư đầu kỳ
    // (cần danh mục hàng hóa + KH) → chứng từ.
    const steps: Array<[string, () => Promise<ImportResult>]> = [
      // Danh mục
      ['Cơ cấu tổ chức', () => app.get(OrganizationUnitService).importXlsx(xlsx('Danh_sach_co_cau_to_chuc.xlsx'))],
      ['Hệ thống tài khoản', () => app.get(AccountService).importXlsx(xlsx('Danh_sach_he_thong_tai_khoan_.xlsx'))],
      ['Tài khoản ngầm định', () => app.get(DefaultAccountService).importXlsx(xlsx('Danh_sach_tai_khoan_ngam_dinh.xlsx'))],
      ['Tài khoản kết chuyển', () => app.get(TransferAccountService).importXlsx(xlsx('Danh_sach_tai_khoan_ket_chuyen.xlsx'))],
      ['Đơn vị tính', () => app.get(UnitService).importXlsx(xlsx('Danh_sach_don_vi_tinh.xlsx'))],
      ['Loại chứng từ', () => app.get(VoucherTypeService).importXlsx(xlsx('Danh_sach_loai_chung_tu.xlsx'))],
      ['Ngân hàng', () => app.get(CatalogBankService).importXlsx(xlsx('Danh_sach_ngan_hang.xlsx'))],
      ['Tài khoản ngân hàng', () => app.get(BankAccountService).importXlsx(xlsx('Danh_sach_tai_khoan_ngan_hang.xlsx'))],
      ['Nhóm KH, NCC', () => app.get(PartnerGroupService).importXlsx(xlsx('Danh_sach_nhom_khach_hang_nha_cung_cap.xlsx'))],
      ['Nhóm VTHH', () => app.get(ProductGroupService).importXlsx(xlsx('Danh_sach_nhom_vat_tu_hang_hoa_dich_vu.xlsx'))],
      ['Kho', () => app.get(WarehouseService).importXlsx(xlsx('Danh_sach_kho.xlsx'))],
      ['Khoản mục chi phí', () => app.get(ExpenseItemService).importXlsx(xlsx('Danh_sach_khoan_muc_chi_phi_.xlsx'))],
      ['Đối tượng tập hợp chi phí', () => app.get(CostObjectService).importXlsx(xlsx('Doi_tuong_tap_hop_chi_phi.xlsx'))],
      ['Mục thu/chi', () => app.get(IncomeExpenseItemService).importXlsx(xlsx('Danh_sach_muc_thuchi.xlsx'))],
      ['Nhân viên', () => app.get(EmployeeService).importXlsx(xlsx('Danh_sach_nhan_vien.xlsx'))],
      ['Hàng hóa, dịch vụ', () => app.get(ProductService).importXlsx(xlsx('Danh_sach_hang_hoa_dich_vu.xlsx'))],
      // Đối tượng
      ['Khách hàng', () => app.get(CustomerService).importXlsx(xlsx('Danh_sach_khach_hang.xlsx'))],
      ['Nhà cung cấp', () => app.get(SupplierService).importXlsx(xlsx('Danh_sach_nha_cung_cap.xlsx'))],
      // Số dư đầu kỳ
      ['Số dư tài khoản', () => openingBalance.importAccountBalancesXlsx(xlsx('Danh_sach_so_du_tai_khoan.xlsx'))],
      ['Công nợ KH đầu kỳ (131)', () => openingBalance.importPartnerBalancesXlsx('131', xlsx('Danh_sach_cong_no_khach_hang.xlsx'))],
      ['TSCĐ đầu kỳ', () => openingBalance.importFixedAssetBalancesXlsx(xlsx('Danh_sach_tai_san_co_dinh_dau_ky.xlsx'))],
      ['Tồn kho đầu kỳ', () => openingBalance.importInventoryBalancesXlsx(xlsx('Danh_sach_ton_kho_vthh.xlsx'))],
      // Chứng từ
      ['Thu chi tiền mặt', () => app.get(CashService).importXlsx(xlsx('Thu_chi_tien_mat.xlsx'))],
      ['Thu chi tiền gửi', () => app.get(BankService).importXlsx(xlsx('Thu_chi_tien_gui.xlsx'))],
      ['Mua hàng', () => app.get(PurchaseService).importXlsx(xlsx('Mua_hang_hoa_dich_vu.xlsx'))],
      ['Nhập kho', () => app.get(ReceiptService).importXlsx(xlsx('Nhap_kho.xlsx'))],
      ['Xuất kho', () => app.get(GoodsIssueService).importXlsx(xlsx('Xuat_kho.xlsx'))],
      ['Chứng từ nghiệp vụ khác', () => app.get(GeneralService).importXlsx(xlsx('Chung_tu_nghiep_vu_khac.xlsx'))],
      ['Bán hàng', () => app.get(SalesService).importXlsx(xlsx('Ban_hang.xlsx'))],
    ]

    for (const [label, run] of steps) {
      const r = await run()
      console.log(`${label}: ${r.created} mới / ${r.total} dòng (bỏ qua ${r.skipped})`)
    }

    // ── Làm giàu: dòng hàng chi tiết + liên kết chứng từ + số dư đầu kỳ chi tiết ──
    console.log('Đang làm giàu dữ liệu (dòng hàng, liên kết, số dư)…')
    const e = await enrichSeed(prisma)
    console.log(
      `Làm giàu xong: ${e.salesLines} dòng bán hàng, ${e.purchaseItems} dòng mua hàng, ` +
        `${e.receiptsLinked} nhập kho ↔ mua hàng, ${e.issuesLinked} xuất kho ↔ bán hàng, ` +
        `${e.salesPaid} bán hàng ↔ phiếu thu, số dư NH: ${e.bankOpening}.`,
    )

    console.log('Seed xong.')
  } finally {
    await app.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
