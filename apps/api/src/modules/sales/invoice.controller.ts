import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreateInvoiceDto } from './dto/create-invoice.dto'
import { InvoiceFilterDto } from './dto/invoice-filter.dto'
import { InvoiceService } from './invoice.service'

@ApiTags('sales')
@Controller('sales/invoices')
export class InvoiceController {
  constructor(private readonly invoices: InvoiceService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách hóa đơn (lọc + phân trang)' })
  list(@Query() filter: InvoiceFilterDto) {
    return this.invoices.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 hóa đơn' })
  findOne(@Param('id') id: string) {
    return this.invoices.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Tạo hóa đơn nhập tay (chưa phát hành)' })
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoices.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu hóa đơn từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.invoices.importXlsx(file.buffer)
  }

  @Post(':id/issue')
  @ApiOperation({ summary: 'Phát hành hóa đơn (cấp số + mã CQT)' })
  issue(@Param('id') id: string) {
    return this.invoices.issue(id)
  }
}
