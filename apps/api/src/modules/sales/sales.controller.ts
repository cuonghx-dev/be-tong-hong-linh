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
import { CreateSalesVoucherDto } from './dto/create-sales-voucher.dto'
import { SalesVoucherFilterDto } from './dto/sales-voucher-filter.dto'
import { UpdateSalesVoucherDto } from './dto/update-sales-voucher.dto'
import { SalesService } from './sales.service'

@ApiTags('sales')
@Controller('sales/vouchers')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách chứng từ bán hàng (lọc + phân trang)' })
  list(@Query() filter: SalesVoucherFilterDto) {
    return this.sales.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 chứng từ bán hàng' })
  findOne(@Param('id') id: string) {
    return this.sales.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Tạo chứng từ bán hàng (kèm sinh hóa đơn nếu chọn)' })
  create(@Body() dto: CreateSalesVoucherDto) {
    return this.sales.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu chứng từ bán hàng từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.sales.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa chứng từ bán hàng' })
  update(@Param('id') id: string, @Body() dto: UpdateSalesVoucherDto) {
    return this.sales.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa chứng từ bán hàng' })
  remove(@Param('id') id: string) {
    return this.sales.remove(id)
  }
}
