import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { PayableFilterDto } from './dto/payable-filter.dto'
import { PayableService } from './payable.service'

@ApiTags('purchase')
@Controller('purchase/payables')
export class PayableController {
  constructor(private readonly payables: PayableService) {}

  @Get()
  @ApiOperation({ summary: 'Đối chiếu công nợ phải trả theo nhà cung cấp (tổng hợp)' })
  list(@Query() filter: PayableFilterDto) {
    return this.payables.list(filter)
  }
}
