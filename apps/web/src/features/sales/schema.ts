import { CustomerType, InvoicePaymentForm, SalesPaymentMode, SalesVoucherType } from '@app/shared'
import { z } from 'zod'

// Dòng hàng tiền chứng từ bán hàng. Dòng ghi chú (SL 0) được để trống tên;
// dòng hàng thật (SL > 0) bắt buộc có tên hàng (mirror purchase).
export const salesLineSchema = z
  .object({
    itemId: z.string().optional(),
    itemName: z.string().optional(),
    tradeDiscount: z.coerce.number().min(0).optional(),
    unit: z.string().optional(),
    quantity: z.coerce.number().min(0, 'Số lượng ≥ 0'),
    unitPrice: z.coerce.number().min(0, 'Đơn giá ≥ 0'),
    vatRate: z.coerce.number().min(0).max(100).optional(),
    lotNo: z.string().optional(),
    debtAccount: z.string().optional(),
    revenueAccount: z.string().optional(),
    vatAccount: z.string().optional(),
    // Tab Giá vốn — kho xuất + TK giá vốn/TK kho + đơn giá vốn.
    warehouseId: z.string().optional(),
    costAccount: z.string().optional(),
    inventoryAccount: z.string().optional(),
    costPrice: z.coerce.number().min(0).optional(),
  })
  .superRefine((l, ctx) => {
    if (l.quantity > 0 && !l.itemName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['itemName'], message: 'Nhập tên hàng' })
    }
  })

export const salesVoucherSchema = z.object({
  voucherType: z.nativeEnum(SalesVoucherType),
  paymentMode: z.nativeEnum(SalesPaymentMode),
  isInventoryIssue: z.boolean().optional(),
  withInvoice: z.boolean().optional(),
  isPosInvoice: z.boolean().optional(),
  invoiceNo: z.string().optional(),
  postingDate: z.string().min(1, 'Chọn ngày hạch toán'),
  voucherDate: z.string().min(1, 'Chọn ngày chứng từ'),
  customerId: z.string().optional(),
  customerName: z.string().min(1, 'Nhập tên khách hàng'),
  taxCode: z.string().optional(),
  contactPerson: z.string().optional(),
  address: z.string().optional(),
  salesEmployeeId: z.string().optional(),
  description: z.string().optional(),
  paymentTermId: z.string().optional(),
  creditDays: z.coerce.number().int().min(0).optional(),
  dueDate: z.string().optional(),
  // Tab Phiếu xuất — lý do xuất (trống thì backend tự sinh theo KH + số CT).
  issueReason: z.string().optional(),
  // Tab Hóa đơn (§3).
  invoiceForm: z.string().optional(),
  invoiceSerial: z.string().optional(),
  invoiceDate: z.string().optional(),
  buyerName: z.string().optional(),
  invoicePaymentForm: z.nativeEnum(InvoicePaymentForm).optional(),
  bankAccountNo: z.string().optional(),
  phone: z.string().optional(),
  budgetRelationCode: z.string().optional(),
  idCardNo: z.string().optional(),
  passportNo: z.string().optional(),
  lines: z
    .array(salesLineSchema)
    .min(1, 'Cần ít nhất 1 dòng hàng')
    // Chặn chứng từ rỗng: toàn dòng ghi chú / SL 0 không phải chứng từ bán hàng.
    .refine((ls) => ls.some((l) => l.quantity > 0), 'Cần ít nhất 1 dòng hàng có số lượng > 0'),
})

// Khách hàng.
export const customerSchema = z.object({
  code: z.string().min(1, 'Nhập mã khách hàng'),
  name: z.string().min(1, 'Nhập tên khách hàng'),
  type: z.nativeEnum(CustomerType),
  isSupplier: z.boolean().optional(),
  isInternal: z.boolean().optional(),
  taxCode: z.string().optional(),
  budgetRelationCode: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  groupId: z.string().optional(),
  salesEmployeeId: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
})

export type SalesVoucherFormValues = z.infer<typeof salesVoucherSchema>
export type SalesLineFormValues = z.infer<typeof salesLineSchema>
export type CustomerFormValues = z.infer<typeof customerSchema>
