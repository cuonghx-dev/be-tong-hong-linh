import { BankPaymentMethod, BankVoucherCategory, BankVoucherType, PartnerType } from '@app/shared'
import { z } from 'zod'
import { optionalEnum } from '@/shared/lib/form'

// Dòng hạch toán. TK Nợ/Có bắt buộc — vế quỹ form tự điền 1121, vế đối ứng
// người dùng phải chọn (backend cũng chặn, xem normalizeLines bank.service).
export const bankLineSchema = z.object({
  description: z.string().optional(),
  debitAccount: z.string().min(1, 'Chọn TK Nợ'),
  creditAccount: z.string().min(1, 'Chọn TK Có'),
  amount: z.number().positive('Số tiền > 0'),
  partnerId: z.string().optional(),
  partnerName: z.string().optional(),
})

export const bankVoucherSchema = z
  .object({
    type: z.nativeEnum(BankVoucherType),
    category: z.nativeEnum(BankVoucherCategory),
    paymentMethod: optionalEnum(BankPaymentMethod),
    isBatchTransfer: z.boolean().optional(),
    internalRef: z.string().optional(),
    postingDate: z.string().min(1, 'Chọn ngày hạch toán'),
    voucherDate: z.string().min(1, 'Chọn ngày chứng từ'),
    bankAccountNo: z.string().min(1, 'Nhập số tài khoản ngân hàng'),
    bankName: z.string().optional(),
    receiverAccountNo: z.string().optional(),
    receiverBankName: z.string().optional(),
    partnerType: optionalEnum(PartnerType),
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
  // Chuyển tiền nội bộ (CTNB) phải có đủ 2 đầu: tài khoản đi + tài khoản đến.
  .superRefine((v, ctx) => {
    if (v.type === BankVoucherType.Transfer && !v.receiverAccountNo?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['receiverAccountNo'],
        message: 'Chọn tài khoản đến',
      })
    }
  })

export type BankVoucherFormValues = z.infer<typeof bankVoucherSchema>
export type BankLineFormValues = z.infer<typeof bankLineSchema>
