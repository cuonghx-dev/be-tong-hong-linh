import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreateInventoryReceiptDto } from './dto/create-receipt.dto'
import { InventoryReceiptFilterDto } from './dto/receipt-filter.dto'
import { UpdateInventoryReceiptDto } from './dto/update-receipt.dto'
import { ReceiptService } from './receipt.service'

@ApiTags('inventory')
@Controller('inventory/receipts')
export class ReceiptController {
  constructor(private readonly receipt: ReceiptService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách phiếu nhập kho (lọc + phân trang)' })
  list(@Query() filter: InventoryReceiptFilterDto) {
    return this.receipt.list(filter)
  }

  // Đặt TRƯỚC @Get(':id') để route ':id' không nuốt mất 'next-no'.
  @Get('next-no')
  @ApiOperation({ summary: 'Xem trước số phiếu nhập kế tiếp (chỉ hiển thị, không giữ chỗ)' })
  nextNo() {
    return this.receipt.previewNextVoucherNo()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 phiếu nhập kho' })
  findOne(@Param('id') id: string) {
    return this.receipt.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Tạo phiếu nhập kho' })
  create(@Body() dto: CreateInventoryReceiptDto) {
    return this.receipt.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu phiếu nhập kho từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.receipt.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa phiếu nhập kho' })
  update(@Param('id') id: string, @Body() dto: UpdateInventoryReceiptDto) {
    return this.receipt.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phiếu nhập kho' })
  remove(@Param('id') id: string) {
    return this.receipt.remove(id)
  }
}
