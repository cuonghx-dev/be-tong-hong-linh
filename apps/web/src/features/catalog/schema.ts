import {
  AccountNature,
  CostObjectType,
  IncomeExpenseType,
  ProductType,
  TransferSide,
} from '@app/shared'
import { z } from 'zod'

// Vật tư, hàng hóa, dịch vụ.
// Giá/tồn tối thiểu là chuỗi số (Decimal); '' = chưa nhập → gửi undefined.
const decimalString = z
  .string()
  .refine((v) => v === '' || !Number.isNaN(Number(v)), 'Nhập số hợp lệ')
  .optional()

export const productSchema = z.object({
  code: z.string().min(1, 'Nhập mã hàng hóa'),
  name: z.string().min(1, 'Nhập tên hàng hóa'),
  type: z.nativeEnum(ProductType),
  groupCode: z.string().optional(),
  unit: z.string().optional(),
  description: z.string().optional(),
  purchaseDescription: z.string().optional(),
  saleDescription: z.string().optional(),
  defaultWarehouseCode: z.string().optional(),
  defaultWarehouseName: z.string().optional(),
  inventoryAccount: z.string().optional(),
  revenueAccount: z.string().optional(),
  discountAccount: z.string().optional(),
  saleReturnAccount: z.string().optional(),
  costAccount: z.string().optional(),
  purchasePrice: decimalString,
  salePrice: decimalString,
  minStock: decimalString,
  vatRate: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type ProductFormValues = z.infer<typeof productSchema>

// Kho.
export const warehouseSchema = z.object({
  code: z.string().min(1, 'Nhập mã kho'),
  name: z.string().min(1, 'Nhập tên kho'),
  address: z.string().optional(),
  branch: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type WarehouseFormValues = z.infer<typeof warehouseSchema>

// Nhân viên.
export const employeeSchema = z.object({
  code: z.string().min(1, 'Nhập mã nhân viên'),
  name: z.string().min(1, 'Nhập tên nhân viên'),
  title: z.string().optional(),
  department: z.string().optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type EmployeeFormValues = z.infer<typeof employeeSchema>

// Nhóm khách hàng, nhà cung cấp.
export const partnerGroupSchema = z.object({
  code: z.string().min(1, 'Nhập mã nhóm KH, NCC'),
  name: z.string().min(1, 'Nhập tên nhóm khách hàng, nhà cung cấp'),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type PartnerGroupFormValues = z.infer<typeof partnerGroupSchema>

// Ngân hàng.
export const bankSchema = z.object({
  shortName: z.string().min(1, 'Nhập tên viết tắt'),
  fullName: z.string().min(1, 'Nhập tên đầy đủ'),
  isActive: z.boolean().optional(),
})

export type BankFormValues = z.infer<typeof bankSchema>

// Tài khoản ngân hàng.
export const bankAccountSchema = z.object({
  accountNumber: z.string().min(1, 'Nhập số tài khoản'),
  bankName: z.string().min(1, 'Nhập tên ngân hàng'),
  bankBranch: z.string().optional(),
  accountHolder: z.string().optional(),
  branch: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>

// Đối tượng tập hợp chi phí.
export const costObjectSchema = z.object({
  code: z.string().min(1, 'Nhập mã đối tượng THCP'),
  name: z.string().min(1, 'Nhập tên đối tượng THCP'),
  type: z.nativeEnum(CostObjectType),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type CostObjectFormValues = z.infer<typeof costObjectSchema>

// Khoản mục chi phí.
export const expenseItemSchema = z.object({
  code: z.string().min(1, 'Nhập mã khoản mục chi phí'),
  name: z.string().min(1, 'Nhập tên khoản mục chi phí'),
  description: z.string().optional(),
  parentId: z.string().optional(), // '' = khoản mục gốc
  isActive: z.boolean().optional(),
})

export type ExpenseItemFormValues = z.infer<typeof expenseItemSchema>

// Hệ thống tài khoản.
export const accountSchema = z.object({
  number: z.string().min(1, 'Nhập số tài khoản'),
  name: z.string().min(1, 'Nhập tên tài khoản'),
  nature: z.nativeEnum(AccountNature),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().optional(), // '' = tài khoản gốc
  isActive: z.boolean().optional(),
})

export type AccountFormValues = z.infer<typeof accountSchema>

// Tài khoản kết chuyển.
export const transferAccountSchema = z.object({
  order: z.coerce
    .number({ invalid_type_error: 'Nhập thứ tự kết chuyển' })
    .int('Thứ tự phải là số nguyên'),
  code: z.string().min(1, 'Nhập mã kết chuyển'),
  fromAccount: z.string().min(1, 'Nhập TK kết chuyển từ'),
  toAccount: z.string().min(1, 'Nhập TK kết chuyển đến'),
  side: z.nativeEnum(TransferSide),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type TransferAccountFormValues = z.infer<typeof transferAccountSchema>

// Loại chứng từ.
export const voucherTypeSchema = z.object({
  code: z.string().min(1, 'Nhập mã loại chứng từ'),
  name: z.string().min(1, 'Nhập tên loại chứng từ'),
  isActive: z.boolean().optional(),
})

export type VoucherTypeFormValues = z.infer<typeof voucherTypeSchema>

// Tài khoản ngầm định.
export const defaultAccountSchema = z.object({
  name: z.string().min(1, 'Nhập loại nghiệp vụ'),
  debitAccount: z.string().optional(),
  creditAccount: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type DefaultAccountFormValues = z.infer<typeof defaultAccountSchema>

// Mục thu/chi.
export const incomeExpenseItemSchema = z.object({
  code: z.string().min(1, 'Nhập mã mục thu/chi'),
  name: z.string().min(1, 'Nhập tên mục thu/chi'),
  type: z.nativeEnum(IncomeExpenseType),
  recurring: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export type IncomeExpenseItemFormValues = z.infer<typeof incomeExpenseItemSchema>

// Đơn vị tính.
export const unitSchema = z.object({
  name: z.string().min(1, 'Nhập đơn vị tính'),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type UnitFormValues = z.infer<typeof unitSchema>
