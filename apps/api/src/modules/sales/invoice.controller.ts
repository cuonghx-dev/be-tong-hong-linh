import { Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
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

  @Post(':id/issue')
  @ApiOperation({ summary: 'Phát hành hóa đơn (cấp số + mã CQT)' })
  issue(@Param('id') id: string) {
    return this.invoices.issue(id)
  }
}
