import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
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
