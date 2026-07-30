import { GeneralLineOperation } from '@app/shared'
import { z } from 'zod'

// Dòng hạch toán chứng từ nghiệp vụ khác — TK Nợ/Có tự nhập nhưng bắt buộc:
// mỗi dòng là 1 bút toán, thiếu 1 vế là sổ sách lệch.
export const generalLineSchema = z.object({
  description: z.string().optional(),
  debitAccount: z.string().min(1, 'Chọn TK Nợ'),
  creditAccount: z.string().min(1, 'Chọn TK Có'),
  amount: z.number().positive('Số tiền > 0'),
  // Select rỗng trả '' → cho phép, submit map về null.
  operation: z.nativeEnum(GeneralLineOperation).or(z.literal('')).optional(),
  debitPartnerId: z.string().optional(),
  debitPartnerName: z.string().optional(),
  creditPartnerId: z.string().optional(),
  creditPartnerName: z.string().optional(),
})

export const generalVoucherSchema = z.object({
  postingDate: z.string().min(1, 'Chọn ngày hạch toán'),
  voucherDate: z.string().min(1, 'Chọn ngày chứng từ'),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  branchId: z.string().optional(),
  lines: z.array(generalLineSchema).min(1, 'Cần ít nhất 1 dòng hạch toán'),
})

export type GeneralVoucherFormValues = z.infer<typeof generalVoucherSchema>
export type GeneralLineFormValues = z.infer<typeof generalLineSchema>
