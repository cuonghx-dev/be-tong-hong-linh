import { GoodsIssueCategory, InventoryReceiptType } from '@app/shared'
import { z } from 'zod'

// Dòng hàng của phiếu nhập kho. Dòng ghi chú (SL 0) được để trống tên;
// dòng hàng thật (SL > 0) bắt buộc có tên hàng (mirror purchase).
export const receiptLineSchema = z
  .object({
    itemId: z.string().optional(),
    itemName: z.string().optional(),
    warehouseId: z.string().optional(),
    debitAccount: z.string().optional(),
    creditAccount: z.string().optional(),
    unit: z.string().optional(),
    quantity: z.coerce.number().min(0, 'Số lượng ≥ 0'),
    unitPrice: z.coerce.number().min(0, 'Đơn giá ≥ 0'),
    lotNo: z.string().optional(),
    expiryDate: z.string().optional(),
  })
  .superRefine((l, ctx) => {
    if (l.quantity > 0 && !l.itemName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['itemName'], message: 'Nhập tên hàng' })
    }
  })

export const receiptSchema = z.object({
  receiptType: z.nativeEnum(InventoryReceiptType),
  postingDate: z.string().min(1, 'Chọn ngày hạch toán'),
  voucherDate: z.string().min(1, 'Chọn ngày chứng từ'),
  partnerId: z.string().optional(),
  partnerName: z.string().optional(),
  address: z.string().optional(),
  deliverer: z.string().optional(),
  description: z.string().optional(),
  reference: z.string().optional(),
  attachmentCount: z.coerce.number().int().min(0).optional(),
  branchName: z.string().optional(),
  lines: z
    .array(receiptLineSchema)
    .min(1, 'Cần ít nhất 1 dòng hàng')
    .refine((ls) => ls.some((l) => l.quantity > 0), 'Cần ít nhất 1 dòng hàng có số lượng > 0'),
})

export type ReceiptFormValues = z.infer<typeof receiptSchema>
export type ReceiptLineFormValues = z.infer<typeof receiptLineSchema>

// Dòng hàng của phiếu xuất kho. Cùng luật dòng ghi chú như phiếu nhập.
export const goodsIssueLineSchema = z
  .object({
    itemId: z.string().optional(),
    itemName: z.string().optional(),
    warehouseId: z.string().optional(),
    debitAccount: z.string().optional(),
    creditAccount: z.string().optional(),
    unit: z.string().optional(),
    quantity: z.coerce.number().min(0, 'Số lượng ≥ 0'),
    unitPrice: z.coerce.number().min(0, 'Đơn giá ≥ 0'),
    lotNo: z.string().optional(),
    expiryDate: z.string().optional(),
    // Lý do xuất sản xuất: mã thành phẩm mà NVL này dùng để sản xuất.
    finishedProduct: z.string().optional(),
  })
  .superRefine((l, ctx) => {
    if (l.quantity > 0 && !l.itemName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['itemName'], message: 'Nhập tên hàng' })
    }
  })

export const goodsIssueSchema = z.object({
  category: z.nativeEnum(GoodsIssueCategory),
  postingDate: z.string().min(1, 'Chọn ngày hạch toán'),
  voucherDate: z.string().min(1, 'Chọn ngày chứng từ'),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  receiver: z.string().optional(),
  address: z.string().optional(),
  salesEmployeeId: z.string().optional(),
  // Lý do xuất sản xuất: mã người nhận (nhân viên) + bộ phận.
  receiverId: z.string().optional(),
  department: z.string().optional(),
  description: z.string().optional(),
  attachmentCount: z.coerce.number().int().min(0).optional(),
  deliveryLocation: z.string().optional(),
  lines: z
    .array(goodsIssueLineSchema)
    .min(1, 'Cần ít nhất 1 dòng hàng')
    .refine((ls) => ls.some((l) => l.quantity > 0), 'Cần ít nhất 1 dòng hàng có số lượng > 0'),
})

export type GoodsIssueFormValues = z.infer<typeof goodsIssueSchema>
export type GoodsIssueLineFormValues = z.infer<typeof goodsIssueLineSchema>
