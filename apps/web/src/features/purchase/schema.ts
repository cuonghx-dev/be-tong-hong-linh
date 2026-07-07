import {
  ItemNature,
  ItemTaxReduction,
  PaymentMethod,
  PurchasePaymentMode,
  PurchaseVoucherType,
  SupplierType,
} from '@app/shared'
import { z } from 'zod'

// Dòng hàng tiền của chứng từ mua hàng.
export const purchaseLineSchema = z.object({
  itemId: z.string().optional(),
  itemName: z.string().optional(),
  warehouseId: z.string().optional(),
  stockAccount: z.string().optional(),
  payableAccount: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.coerce.number().min(0, 'Số lượng ≥ 0'),
  unitPrice: z.coerce.number().min(0, 'Đơn giá ≥ 0'),
  vatRate: z.coerce.number().min(0).max(100).optional(),
  vatAccount: z.string().optional(),
})

export const purchaseVoucherSchema = z.object({
  type: z.nativeEnum(PurchaseVoucherType),
  paymentMode: z.nativeEnum(PurchasePaymentMode),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  receiveWithInvoice: z.boolean().optional(),
  invoiceNo: z.string().optional(),
  postingDate: z.string().min(1, 'Chọn ngày hạch toán'),
  voucherDate: z.string().min(1, 'Chọn ngày chứng từ'),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  deliverer: z.string().optional(),
  address: z.string().optional(),
  employeeId: z.string().optional(),
  description: z.string().optional(),
  attachmentCount: z.coerce.number().int().min(0).optional(),
  contractNo: z.string().optional(),
  paymentTermId: z.string().optional(),
  creditDays: z.coerce.number().int().min(0).optional(),
  dueDate: z.string().optional(),
  purchaseCost: z.coerce.number().min(0).optional(),
  einvoiceLookupCode: z.string().optional(),
  einvoiceLookupUrl: z.string().optional(),
  branchId: z.string().optional(),
  lines: z.array(purchaseLineSchema).min(1, 'Cần ít nhất 1 dòng hàng'),
})

export type PurchaseVoucherFormValues = z.infer<typeof purchaseVoucherSchema>
export type PurchaseLineFormValues = z.infer<typeof purchaseLineSchema>

// Nhà cung cấp.
export const supplierSchema = z.object({
  code: z.string().min(1, 'Nhập mã nhà cung cấp'),
  name: z.string().min(1, 'Nhập tên nhà cung cấp'),
  type: z.nativeEnum(SupplierType),
  isCustomer: z.boolean().optional(),
  taxCode: z.string().optional(),
  budgetRelationCode: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  groupId: z.string().optional(),
  employeeId: z.string().optional(),
  isInternal: z.boolean().optional(),
  invoiceRisk: z.string().optional(),
})

export type SupplierFormValues = z.infer<typeof supplierSchema>

// Hàng hóa - dịch vụ.
export const itemSchema = z.object({
  code: z.string().min(1, 'Nhập mã hàng hóa'),
  name: z.string().min(1, 'Nhập tên hàng hóa'),
  nature: z.nativeEnum(ItemNature),
  taxReduction: z.nativeEnum(ItemTaxReduction),
  groupName: z.string().optional(),
  unit: z.string().optional(),
  minStock: z.coerce.number().min(0).optional(),
  warrantyMonths: z.coerce.number().int().min(0).optional(),
  origin: z.string().optional(),
  description: z.string().optional(),
  purchaseDescription: z.string().optional(),
  salesDescription: z.string().optional(),
  defaultWarehouse: z.string().optional(),
  stockAccount: z.string().optional(),
  revenueAccount: z.string().optional(),
  expenseAccount: z.string().optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  salePrice: z.coerce.number().min(0).optional(),
  vatRate: z.coerce.number().min(0).max(100).optional(),
  priceAfterTax: z.boolean().optional(),
  branchName: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type ItemFormValues = z.infer<typeof itemSchema>
