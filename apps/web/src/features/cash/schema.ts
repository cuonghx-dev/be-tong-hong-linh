import { CashVoucherCategory, CashVoucherType, PartnerType } from '@app/shared'
import { z } from 'zod'
import { optionalEnum } from '@/shared/lib/form'

// Dòng hạch toán. TK Nợ/Có bắt buộc — vế quỹ form tự điền 1111, vế đối ứng
// người dùng phải chọn (backend cũng chặn, xem normalizeLines cash.service).
export const cashLineSchema = z.object({
  description: z.string().optional(),
  debitAccount: z.string().min(1, 'Chọn TK Nợ'),
  creditAccount: z.string().min(1, 'Chọn TK Có'),
  amount: z.number().positive('Số tiền > 0'),
  operation: z.string().optional(),
  partnerId: z.string().optional(),
  partnerName: z.string().optional(),
  costItemId: z.string().optional(),
  bankAccountNo: z.string().optional(),
  bankName: z.string().optional(),
})

// Dòng thuế GTGT (tab "Kê khai hóa đơn và hạch toán thuế" — Chi mua ngoài có HĐ).
// amount = tiền thuế, cho phép 0 → dòng 0 đồng bị loại khi submit (backend chặn amount ≤ 0).
export const cashTaxLineSchema = z.object({
  description: z.string().optional(),
  hasInvoice: z.boolean().optional(),
  vatRate: z.number().min(0).optional(),
  amount: z.number().min(0),
  vatAccount: z.string().min(1, 'Chọn TK thuế GTGT'),
  invoiceDate: z.string().optional(),
  invoiceNo: z.string().optional(),
  goodsServiceGroup: z.string().optional(),
  partnerId: z.string().optional(), // Mã NCC
  partnerName: z.string().optional(), // Tên NCC
  supplierTaxCode: z.string().optional(),
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
  // Dòng thuế GTGT — chỉ dùng khi loại nghiệp vụ là Chi mua ngoài có hóa đơn.
  taxLines: z.array(cashTaxLineSchema).optional(),
})

export type CashVoucherFormValues = z.infer<typeof cashVoucherSchema>
export type CashLineFormValues = z.infer<typeof cashLineSchema>
export type CashTaxLineFormValues = z.infer<typeof cashTaxLineSchema>
