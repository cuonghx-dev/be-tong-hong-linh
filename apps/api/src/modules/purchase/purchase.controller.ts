import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreatePurchaseVoucherDto } from './dto/create-purchase-voucher.dto'
import { PurchaseVoucherFilterDto } from './dto/purchase-voucher-filter.dto'
import { UpdatePurchaseVoucherDto } from './dto/update-purchase-voucher.dto'
import { PurchaseService } from './purchase.service'

@ApiTags('purchase')
@Controller('purchase/vouchers')
export class PurchaseController {
  constructor(private readonly purchase: PurchaseService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách chứng từ mua hàng (lọc + phân trang)' })
  list(@Query() filter: PurchaseVoucherFilterDto) {
    return this.purchase.list(filter)
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
