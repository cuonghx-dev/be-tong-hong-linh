import type { GeneralLineOperation, GeneralTaxType } from '../enums'

// Type request/response phân hệ Tổng hợp — Chứng từ nghiệp vụ khác (NVK), dùng chung FE ↔ BE.

// Dòng hạch toán (bút toán) của chứng từ nghiệp vụ khác.
export interface GeneralVoucherLineDto {
  id: string
  lineNo: number
  description: string | null
  debitAccount: string // TK Nợ — tự nhập, không có TK mặc định
  creditAccount: string // TK Có — tự nhập
  amount: string // Decimal serialize thành string (đồng, không float)
  operation: GeneralLineOperation | null // Nghiệp vụ
  debitPartnerId: string | null // Đối tượng Nợ
  debitPartnerName: string | null
  creditPartnerId: string | null // Đối tượng Có
  creditPartnerName: string | null
}

// Dòng kê khai hóa đơn (tab "Kê khai hóa đơn và hạch toán thuế") — chỉ lên
// bảng kê thuế GTGT, không phải bút toán.
export interface GeneralVoucherTaxLineDto {
  id: string
  lineNo: number
  description: string | null // Diễn giải thuế
  hasInvoice: boolean // Có hóa đơn
  taxType: GeneralTaxType | null // Loại thuế
  taxableAmount: string // Giá trị HHDV chưa thuế (Decimal → string)
  vatRate: string | null // % thuế GTGT
  vatAmount: string // Tiền thuế GTGT
  vatAccount: string | null // TK thuế GTGT
  invoiceNo: string | null
  invoiceDate: string | null // ISO
  goodsServiceGroup: string | null
  partnerId: string | null
  partnerName: string | null
  supplierTaxCode: string | null
}

// Chứng từ nghiệp vụ khác.
export interface GeneralVoucherDto {
  id: string
  voucherNo: string // vd NVK261/2025
  postingDate: string // Ngày hạch toán (ISO)
  voucherDate: string // Ngày chứng từ (ISO)
  dueDate: string | null // Hạn thanh toán (ISO)
  description: string | null // Diễn giải
  referenceNo: string | null // Tham chiếu
  totalAmount: string // Σ số tiền dòng
  branchId: string | null
  posted: boolean // Đã ghi sổ — bỏ ghi thì loại khỏi sổ/báo cáo
  excludeFromVatReport: boolean // Không lên bảng kê thuế GTGT
  lines: GeneralVoucherLineDto[]
  taxLines: GeneralVoucherTaxLineDto[]
  createdAt: string
  updatedAt: string
}

// Payload tạo dòng hạch toán.
export interface CreateGeneralVoucherLineInput {
  description?: string | null
  debitAccount: string
  creditAccount: string
  amount: number
  operation?: GeneralLineOperation | null
  debitPartnerId?: string | null
  debitPartnerName?: string | null
  creditPartnerId?: string | null
  creditPartnerName?: string | null
}

// Payload tạo dòng kê khai hóa đơn.
export interface CreateGeneralVoucherTaxLineInput {
  description?: string | null
  hasInvoice?: boolean
  taxType?: GeneralTaxType | null
  taxableAmount?: number
  vatRate?: number | null
  vatAmount?: number
  vatAccount?: string | null
  invoiceNo?: string | null
  invoiceDate?: string | null
  goodsServiceGroup?: string | null
  partnerId?: string | null
  partnerName?: string | null
  supplierTaxCode?: string | null
}

// Payload tạo chứng từ nghiệp vụ khác.
export interface CreateGeneralVoucherInput {
  postingDate: string
  voucherDate: string
  dueDate?: string | null
  description?: string | null
  referenceNo?: string | null
  branchId?: string | null
  excludeFromVatReport?: boolean
  lines: CreateGeneralVoucherLineInput[]
  taxLines?: CreateGeneralVoucherTaxLineInput[]
}

export type UpdateGeneralVoucherInput = Partial<CreateGeneralVoucherInput>

// Tham số lọc danh sách chứng từ nghiệp vụ khác.
export interface GeneralVoucherFilter {
  page?: number
  pageSize?: number
  fromDate?: string
  toDate?: string
  keyword?: string
}
