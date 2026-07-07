import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ReceivableFilterDto } from './dto/receivable-filter.dto'
import { ReceivableService } from './receivable.service'

@ApiTags('sales')
@Controller('sales/receivables')
export class ReceivableController {
  constructor(private readonly receivables: ReceivableService) {}

  @Get()
  @ApiOperation({ summary: 'Công nợ phải thu theo khách hàng (tổng hợp)' })
  list(@Query() filter: ReceivableFilterDto) {
    return this.receivables.list(filter)
  }
}
