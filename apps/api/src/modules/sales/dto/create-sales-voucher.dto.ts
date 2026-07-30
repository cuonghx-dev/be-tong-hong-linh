import { InvoicePaymentForm, SalesPaymentMode, SalesVoucherType } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

// Dòng hàng tiền của chứng từ bán hàng (§3).
export class CreateSalesVoucherLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemName?: string

  @ApiPropertyOptional({ description: 'Chiết khấu thương mại' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tradeDiscount?: number

  @ApiPropertyOptional({ description: 'TK công nợ (mặc định 131, thu ngay → TK tiền)' })
  @IsOptional()
  @IsString()
  debtAccount?: string

  @ApiPropertyOptional({ description: 'TK doanh thu (mặc định 5111)' })
  @IsOptional()
  @IsString()
  revenueAccount?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string

  @ApiProperty({ description: 'Số lượng' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  quantity!: number

  @ApiProperty({ description: 'Đơn giá' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number

  @ApiPropertyOptional({ description: '% Thuế GTGT' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  vatRate?: number

  @ApiPropertyOptional({ description: 'TK thuế GTGT (mặc định 33311)' })
  @IsOptional()
  @IsString()
  vatAccount?: string

  @ApiPropertyOptional({ description: 'Số lô' })
  @IsOptional()
  @IsString()
  lotNo?: string

  // ── Tab Giá vốn (§3): để trống → lấy theo dữ liệu ngầm định của VTHH.
  @ApiPropertyOptional({ description: 'Kho xuất' })
  @IsOptional()
  @IsString()
  warehouseId?: string

  @ApiPropertyOptional({ description: 'TK giá vốn (mặc định 632)' })
  @IsOptional()
  @IsString()
  costAccount?: string

  @ApiPropertyOptional({ description: 'TK kho (mặc định 156)' })
  @IsOptional()
  @IsString()
  inventoryAccount?: string

  @ApiPropertyOptional({ description: 'Đơn giá vốn' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPrice?: number
}

export class CreateSalesVoucherDto {
  @ApiProperty({ enum: SalesVoucherType })
  @IsEnum(SalesVoucherType)
  voucherType!: SalesVoucherType

  @ApiProperty({ enum: SalesPaymentMode })
  @IsEnum(SalesPaymentMode)
  paymentMode!: SalesPaymentMode

  @ApiPropertyOptional({ description: 'Kiêm phiếu xuất' })
  @IsOptional()
  @IsBoolean()
  isInventoryIssue?: boolean

  @ApiPropertyOptional({ description: 'Lập kèm hóa đơn' })
  @IsOptional()
  @IsBoolean()
  withInvoice?: boolean

  @ApiPropertyOptional({ description: 'Là hóa đơn từ máy tính tiền' })
  @IsOptional()
  @IsBoolean()
  isPosInvoice?: boolean

  @ApiPropertyOptional({ description: 'Số hóa đơn' })
  @IsOptional()
  @IsString()
  invoiceNo?: string

  @ApiProperty({ description: 'Ngày hạch toán (ISO)' })
  @IsDateString()
  postingDate!: string

  @ApiProperty({ description: 'Ngày chứng từ (ISO)' })
  @IsDateString()
  voucherDate!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string

  @ApiProperty({ description: 'Tên khách hàng' })
  @IsString()
  @IsNotEmpty({ message: 'Tên khách hàng không được để trống' })
  customerName!: string

  @ApiPropertyOptional({ description: 'MST/CCCD' })
  @IsOptional()
  @IsString()
  taxCode?: string

  @ApiPropertyOptional({ description: 'Người liên hệ' })
  @IsOptional()
  @IsString()
  contactPerson?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ description: 'Nhân viên bán hàng' })
  @IsOptional()
  @IsString()
  salesEmployeeId?: string

  @ApiPropertyOptional({ description: 'Diễn giải' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  attachmentCount?: number

  @ApiPropertyOptional({ description: 'Điều khoản thanh toán' })
  @IsOptional()
  @IsString()
  paymentTermId?: string

  @ApiPropertyOptional({ description: 'Số ngày được nợ' })
  @IsOptional()
  @IsInt()
  @Min(0)
  creditDays?: number

  @ApiPropertyOptional({ description: 'Hạn thanh toán (ISO)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string

  @ApiPropertyOptional({ description: 'Mã tra cứu HĐĐT' })
  @IsOptional()
  @IsString()
  einvoiceLookupCode?: string

  @ApiPropertyOptional({ description: 'Đường dẫn tra cứu HĐĐT' })
  @IsOptional()
  @IsString()
  einvoiceLookupUrl?: string

  @ApiPropertyOptional({ description: 'Lý do xuất (phiếu xuất kho tự sinh)' })
  @IsOptional()
  @IsString()
  issueReason?: string

  // ── Tab Hóa đơn (§3) ──
  @ApiPropertyOptional({ description: 'Mẫu số hóa đơn' })
  @IsOptional()
  @IsString()
  invoiceForm?: string

  @ApiPropertyOptional({ description: 'Ký hiệu hóa đơn' })
  @IsOptional()
  @IsString()
  invoiceSerial?: string

  @ApiPropertyOptional({ description: 'Ngày hóa đơn (ISO)' })
  @IsOptional()
  @IsDateString()
  invoiceDate?: string

  @ApiPropertyOptional({ description: 'Người mua hàng' })
  @IsOptional()
  @IsString()
  buyerName?: string

  @ApiPropertyOptional({ enum: InvoicePaymentForm, description: 'Hình thức thanh toán trên HĐ' })
  @IsOptional()
  @IsEnum(InvoicePaymentForm)
  invoicePaymentForm?: InvoicePaymentForm

  @ApiPropertyOptional({ description: 'Tài khoản ngân hàng ghi trên HĐ' })
  @IsOptional()
  @IsString()
  bankAccountNo?: string

  @ApiPropertyOptional({ description: 'Điện thoại người mua' })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({ description: 'Mã số ĐVQHNS' })
  @IsOptional()
  @IsString()
  budgetRelationCode?: string

  @ApiPropertyOptional({ description: 'Số CCCD' })
  @IsOptional()
  @IsString()
  idCardNo?: string

  @ApiPropertyOptional({ description: 'Số hộ chiếu' })
  @IsOptional()
  @IsString()
  passportNo?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string

  @ApiProperty({ type: [CreateSalesVoucherLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSalesVoucherLineDto)
  lines!: CreateSalesVoucherLineDto[]
}
