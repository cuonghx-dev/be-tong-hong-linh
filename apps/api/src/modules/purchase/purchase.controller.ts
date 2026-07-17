import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { PurchaseVoucherType } from '@prisma/client'
import { CreatePurchaseVoucherDto } from './dto/create-purchase-voucher.dto'
import { PurchaseVoucherFilterDto } from './dto/purchase-voucher-filter.dto'
import { SetPurchasePostedDto } from './dto/set-purchase-posted.dto'
import { UpdatePurchaseVoucherDto } from './dto/update-purchase-voucher.dto'
import { PurchaseService } from './purchase.service'
import { Action, Domain } from '../../common/decorators/domain.decorator'

@ApiTags('purchase')
@Domain('purchase')
@Controller('purchase/vouchers')
export class PurchaseController {
  constructor(private readonly purchase: PurchaseService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách chứng từ mua hàng (lọc + phân trang)' })
  list(@Query() filter: PurchaseVoucherFilterDto) {
    return this.purchase.list(filter)
  }

  // Đặt TRƯỚC @Get(':id') để route ':id' không nuốt mất 'next-no'.
  @Get('next-no')
  @ApiOperation({ summary: 'Xem trước số chứng từ kế tiếp (chỉ hiển thị, không giữ chỗ)' })
  nextNo(
    @Query('type', new ParseEnumPipe(PurchaseVoucherType)) type: PurchaseVoucherType,
    @Query('voucherDate') voucherDate?: string,
  ) {
    return this.purchase.previewNextVoucherNo(type, voucherDate)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 chứng từ mua hàng' })
  findOne(@Param('id') id: string) {
    return this.purchase.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Tạo chứng từ mua hàng' })
  create(@Body() dto: CreatePurchaseVoucherDto) {
    return this.purchase.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu chứng từ mua hàng từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.purchase.importXlsx(file.buffer)
  }

  @Action('post')

  @Patch(':id/posted')
  @ApiOperation({ summary: 'Ghi sổ / bỏ ghi chứng từ mua hàng (đổi cờ posted)' })
  setPosted(@Param('id') id: string, @Body() dto: SetPurchasePostedDto) {
    return this.purchase.setPosted(id, dto.posted)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa chứng từ mua hàng' })
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseVoucherDto) {
    return this.purchase.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa chứng từ mua hàng' })
  remove(@Param('id') id: string) {
    return this.purchase.remove(id)
  }
}
