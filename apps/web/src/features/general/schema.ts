import { z } from 'zod'

// Dòng hạch toán chứng từ nghiệp vụ khác — TK Nợ/Có tự nhập.
export const generalLineSchema = z.object({
  description: z.string().optional(),
  debitAccount: z.string().optional(),
  creditAccount: z.string().optional(),
  amount: z.number().positive('Số tiền > 0'),
  partnerId: z.string().optional(),
  partnerName: z.string().optional(),
})

export const generalVoucherSchema = z.object({
  postingDate: z.string().min(1, 'Chọn ngày hạch toán'),
  voucherDate: z.string().min(1, 'Chọn ngày chứng từ'),
  description: z.string().optional(),
  branchId: z.string().optional(),
  lines: z.array(generalLineSchema).min(1, 'Cần ít nhất 1 dòng hạch toán'),
})

export type GeneralVoucherFormValues = z.infer<typeof generalVoucherSchema>
export type GeneralLineFormValues = z.infer<typeof generalLineSchema>
