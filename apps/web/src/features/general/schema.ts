import { GeneralLineOperation, GeneralTaxType } from '@app/shared'
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

// Dòng kê khai hóa đơn (tab "Kê khai hóa đơn và hạch toán thuế") — chỉ phục vụ
// bảng kê thuế GTGT nên không ràng buộc TK Nợ/Có; dòng trắng bị BE lọc bỏ.
export const generalTaxLineSchema = z.object({
  description: z.string().optional(),
  hasInvoice: z.boolean().optional(),
  taxType: z.nativeEnum(GeneralTaxType).or(z.literal('')).optional(),
  taxableAmount: z.number().min(0, 'Giá trị ≥ 0'),
  vatRate: z.number().min(0).max(100, '% thuế ≤ 100').optional(),
  vatAmount: z.number().min(0, 'Tiền thuế ≥ 0'),
  vatAccount: z.string().optional(),
  invoiceNo: z.string().optional(),
  invoiceDate: z.string().optional(),
  goodsServiceGroup: z.string().optional(),
  partnerId: z.string().optional(),
  partnerName: z.string().optional(),
  supplierTaxCode: z.string().optional(),
})

export const generalVoucherSchema = z.object({
  postingDate: z.string().min(1, 'Chọn ngày hạch toán'),
  voucherDate: z.string().min(1, 'Chọn ngày chứng từ'),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  branchId: z.string().optional(),
  excludeFromVatReport: z.boolean().optional(),
  lines: z.array(generalLineSchema).min(1, 'Cần ít nhất 1 dòng hạch toán'),
  taxLines: z.array(generalTaxLineSchema).optional(),
})

export type GeneralVoucherFormValues = z.infer<typeof generalVoucherSchema>
export type GeneralLineFormValues = z.infer<typeof generalLineSchema>
export type GeneralTaxLineFormValues = z.infer<typeof generalTaxLineSchema>
