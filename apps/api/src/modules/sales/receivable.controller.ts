import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { CollectPaymentDto } from './dto/collect-payment.dto'
import { ReceivableFilterDto } from './dto/receivable-filter.dto'
import { ReceivableService } from './receivable.service'
import { Domain } from '../../common/decorators/domain.decorator'

@ApiTags('sales')
@Domain('sales')
@Controller('sales/receivables')
export class ReceivableController {
  constructor(private readonly receivables: ReceivableService) {}

  @Get()
  @ApiOperation({ summary: 'Công nợ phải thu theo khách hàng (tổng hợp)' })
  list(@Query() filter: ReceivableFilterDto) {
    return this.receivables.list(filter)
  }

  @Get('open-vouchers')
  @ApiOperation({ summary: 'Chứng từ bán hàng còn phải thu của 1 KH (chọn đối trừ)' })
  openVouchers(@Query('customerId') customerId: string) {
    return this.receivables.openVouchers(customerId)
  }

  @Post('collect')
  @ApiOperation({ summary: 'Thu tiền khách hàng theo hóa đơn (sinh PT/NTTK + đối trừ)' })
  collect(@Body() dto: CollectPaymentDto) {
    return this.receivables.collect(dto)
  }
}
