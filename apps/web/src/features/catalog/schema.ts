import { CostObjectType } from '@app/shared'
import { z } from 'zod'

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
