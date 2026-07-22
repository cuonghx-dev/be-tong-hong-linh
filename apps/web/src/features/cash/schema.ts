import { CashVoucherCategory, CashVoucherType, PartnerType } from '@app/shared'
import { z } from 'zod'
import { optionalEnum } from '@/shared/lib/form'

// Dòng hạch toán.
export const cashLineSchema = z.object({
  description: z.string().optional(),
  debitAccount: z.string().optional(),
  creditAccount: z.string().optional(),
  amount: z.number().positive('Số tiền > 0'),
  operation: z.string().optional(),
  partnerId: z.string().optional(),
  partnerName: z.string().optional(),
  costItemId: z.string().optional(),
  bankAccountNo: z.string().optional(),
  bankName: z.string().optional(),
})

export const cashVoucherSchema = z.object({
  type: z.nativeEnum(CashVoucherType),
  category: z.nativeEnum(CashVoucherCategory),
  postingDate: z.string().min(1, 'Chọn ngày hạch toán'),
  voucherDate: z.string().min(1, 'Chọn ngày phiếu'),
  partnerType: optionalEnum(PartnerType),
  partnerId: z.string().optional(),
  partnerName: z.string().optional(),
  payerReceiver: z.string().optional(),
  address: z.string().optional(),
  employeeId: z.string().optional(),
  reason: z.string().optional(),
  attachmentCount: z.coerce.number().int().min(0).optional(),
  branchId: z.string().optional(),
  lines: z.array(cashLineSchema).min(1, 'Cần ít nhất 1 dòng hạch toán'),
})

export type CashVoucherFormValues = z.infer<typeof cashVoucherSchema>
export type CashLineFormValues = z.infer<typeof cashLineSchema>
