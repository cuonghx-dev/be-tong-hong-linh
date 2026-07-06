import { BankPaymentMethod, BankVoucherCategory, BankVoucherType, PartnerType } from '@app/shared'
import { z } from 'zod'

// Dòng hạch toán.
export const bankLineSchema = z.object({
  description: z.string().optional(),
  debitAccount: z.string().optional(),
  creditAccount: z.string().optional(),
  amount: z.number().positive('Số tiền > 0'),
  partnerId: z.string().optional(),
  partnerName: z.string().optional(),
})

export const bankVoucherSchema = z.object({
  type: z.nativeEnum(BankVoucherType),
  category: z.nativeEnum(BankVoucherCategory),
  paymentMethod: z.nativeEnum(BankPaymentMethod).optional(),
  isBatchTransfer: z.boolean().optional(),
  internalRef: z.string().optional(),
  postingDate: z.string().min(1, 'Chọn ngày hạch toán'),
  voucherDate: z.string().min(1, 'Chọn ngày chứng từ'),
  bankAccountNo: z.string().min(1, 'Nhập số tài khoản ngân hàng'),
  bankName: z.string().optional(),
  receiverAccountNo: z.string().optional(),
  partnerType: z.nativeEnum(PartnerType).optional(),
  partnerId: z.string().optional(),
  partnerName: z.string().optional(),
  address: z.string().optional(),
  employeeId: z.string().optional(),
  reason: z.string().optional(),
  reference: z.string().optional(),
  attachmentCount: z.coerce.number().int().min(0).optional(),
  branchId: z.string().optional(),
  lines: z.array(bankLineSchema).min(1, 'Cần ít nhất 1 dòng hạch toán'),
})

export type BankVoucherFormValues = z.infer<typeof bankVoucherSchema>
export type BankLineFormValues = z.infer<typeof bankLineSchema>
