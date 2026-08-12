import type { PrismaService } from '../../src/database/prisma.service'

/**
 * Xóa toàn bộ chứng từ do test tạo (seed chỉ có danh mục + số dư, không có chứng từ
 * nên deleteMany toàn bảng là an toàn). Line + paymentAllocation cascade theo cha;
 * riêng PurchaseCostAllocation.costVoucherId là Restrict nên phải xóa trước.
 */
export async function cleanVouchers(prisma: PrismaService): Promise<void> {
  await prisma.purchaseCostAllocation.deleteMany()
  await prisma.paymentAllocation.deleteMany()
  await prisma.salesVoucher.deleteMany()
  await prisma.purchaseVoucher.deleteMany()
  await prisma.generalVoucher.deleteMany()
  await prisma.goodsIssueVoucher.deleteMany()
  await prisma.inventoryReceipt.deleteMany()
  await prisma.bankVoucher.deleteMany()
  await prisma.cashVoucher.deleteMany()
}

/** Khóa sổ là state toàn cục (1 dòng id=1) — luôn dọn để không lây sang spec khác. */
export async function clearBookLock(prisma: PrismaService): Promise<void> {
  await prisma.bookLock.deleteMany()
}

export async function deleteCustomersByPrefix(prisma: PrismaService, prefix: string): Promise<void> {
  await prisma.customer.deleteMany({ where: { code: { startsWith: prefix } } })
}

export async function deleteSuppliersByPrefix(prisma: PrismaService, prefix: string): Promise<void> {
  await prisma.supplier.deleteMany({ where: { code: { startsWith: prefix } } })
}
