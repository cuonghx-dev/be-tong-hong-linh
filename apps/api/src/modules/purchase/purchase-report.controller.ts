import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { PurchaseReportFilterDto } from './dto/purchase-report-filter.dto'
import { PurchaseReportService } from './purchase-report.service'
import { Domain } from '../../common/decorators/domain.decorator'

@ApiTags('purchase')
@Domain('purchase')
@Controller('purchase/reports')
export class PurchaseReportController {
  constructor(private readonly report: PurchaseReportService) {}

  @Get('detail')
  @ApiOperation({ summary: 'Sổ chi tiết mua hàng' })
  detail(@Query() filter: PurchaseReportFilterDto) {
    return this.report.detail(filter)
  }

  @Get('by-item')
  @ApiOperation({ summary: 'Tổng hợp mua hàng theo mặt hàng' })
  byItem(@Query() filter: PurchaseReportFilterDto) {
    return this.report.byItem(filter)
  }

  @Get('payable-summary')
  @ApiOperation({ summary: 'Tổng hợp công nợ phải trả nhà cung cấp (TK 331)' })
  payableSummary(@Query() filter: PurchaseReportFilterDto) {
    return this.report.payableSummary(filter)
  }

  @Get('payable-detail')
  @ApiOperation({ summary: 'Chi tiết công nợ phải trả nhà cung cấp (TK 331)' })
  payableDetail(@Query() filter: PurchaseReportFilterDto) {
    return this.report.payableDetail(filter)
  }
}
