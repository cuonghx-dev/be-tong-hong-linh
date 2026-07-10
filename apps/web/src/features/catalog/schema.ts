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
