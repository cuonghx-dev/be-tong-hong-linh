import {
  PurchaseOrigin,
  PurchasePaymentMode,
  PurchaseVoucherType,
  SupplierType,
} from '@app/shared'
import { z } from 'zod'

// Dòng hàng tiền của chứng từ mua hàng. Dòng ghi chú (SL 0) được để trống tên;
// dòng hàng thật (SL > 0) bắt buộc có tên hàng.
export const purchaseLineSchema = z
  .object({
    itemId: z.string().optional(),
    itemName: z.string().optional(),
    warehouseId: z.string().optional(),
    stockAccount: z.string().optional(),
    payableAccount: z.string().optional(),
    unit: z.string().optional(),
    quantity: z.coerce.number().min(0, 'Số lượng ≥ 0'),
    unitPrice: z.coerce.number().min(0, 'Đơn giá ≥ 0'),
    vatRate: z.coerce.number().min(0).max(100).optional(),
    vatAccount: z.string().optional(),
  })
  .superRefine((l, ctx) => {
    if (l.quantity > 0 && !l.itemName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['itemName'], message: 'Nhập tên hàng' })
    }
  })

// Dòng phân bổ chi phí (tab Chi phí, §10.4). Field hiển thị (số CT, NCC, tổng
// chi phí, lũy kế phiếu khác) giữ trong form state để render bảng; submit chỉ
// gửi costVoucherId + amount.
export const purchaseCostAllocationSchema = z
  .object({
    costVoucherId: z.string(),
    voucherNo: z.string(),
    postingDate: z.string(),
    voucherDate: z.string(),
    supplierName: z.string().nullable().optional(),
    totalCost: z.coerce.number(),
    allocatedOther: z.coerce.number(), // đã phân bổ cho các phiếu KHÁC
    amount: z.coerce.number().min(0.01, 'Số phân bổ phải > 0'),
  })
  .superRefine((a, ctx) => {
    // Khớp assertCostAllocationsValid backend: Σ phân bổ không vượt tổng chi phí.
    const remaining = a.totalCost - a.allocatedOther
    if (a.amount > remaining) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount'],
        message: `Số phân bổ vượt chi phí còn lại của ${a.voucherNo} (còn ${remaining.toLocaleString('vi-VN')})`,
      })
    }
  })

export const purchaseVoucherSchema = z.object({
  type: z.nativeEnum(PurchaseVoucherType),
  origin: z.nativeEnum(PurchaseOrigin),
  paymentMode: z.nativeEnum(PurchasePaymentMode),
  receiveWithInvoice: z.boolean().optional(),
  invoiceTemplate: z.string().optional(),
  invoiceSeries: z.string().optional(),
  invoiceNo: z.string().optional(),
  invoiceDate: z.string().optional(),
  postingDate: z.string().min(1, 'Chọn ngày hạch toán'),
  voucherDate: z.string().min(1, 'Chọn ngày chứng từ'),
  supplierId: z.string().optional(),
  supplierName: z.string().min(1, 'Nhập tên nhà cung cấp'),
  deliverer: z.string().optional(),
  address: z.string().optional(),
  employeeId: z.string().optional(),
  description: z.string().optional(),
  attachmentCount: z.coerce.number().int().min(0).optional(),
  contractNo: z.string().optional(),
  paymentTermId: z.string().optional(),
  creditDays: z.coerce.number().int().min(0).optional(),
  dueDate: z.string().optional(),
  purchaseCost: z.coerce.number().min(0).optional(),
  costAllocations: z.array(purchaseCostAllocationSchema).optional(),
  einvoiceLookupCode: z.string().optional(),
  einvoiceLookupUrl: z.string().optional(),
  branchId: z.string().optional(),
  lines: z
    .array(purchaseLineSchema)
    .min(1, 'Cần ít nhất 1 dòng hàng')
    // Chặn chứng từ rỗng: toàn dòng ghi chú / SL 0 không phải chứng từ mua hàng.
    .refine((ls) => ls.some((l) => l.quantity > 0), 'Cần ít nhất 1 dòng hàng có số lượng > 0'),
})

export type PurchaseVoucherFormValues = z.infer<typeof purchaseVoucherSchema>
export type PurchaseLineFormValues = z.infer<typeof purchaseLineSchema>
export type PurchaseCostAllocationFormValues = z.infer<typeof purchaseCostAllocationSchema>

// Nhà cung cấp.
export const supplierSchema = z.object({
  code: z.string().min(1, 'Nhập mã nhà cung cấp'),
  name: z.string().min(1, 'Nhập tên nhà cung cấp'),
  type: z.nativeEnum(SupplierType),
  isCustomer: z.boolean().optional(),
  taxCode: z.string().optional(),
  budgetRelationCode: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  groupId: z.string().optional(),
  employeeId: z.string().optional(),
  isInternal: z.boolean().optional(),
  invoiceRisk: z.string().optional(),
})

export type SupplierFormValues = z.infer<typeof supplierSchema>
