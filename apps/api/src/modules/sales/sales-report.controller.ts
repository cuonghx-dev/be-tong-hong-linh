import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { SalesReportFilterDto } from './dto/sales-report-filter.dto'
import { SalesReportService } from './sales-report.service'

@ApiTags('sales')
@Controller('sales/reports')
export class SalesReportController {
  constructor(private readonly report: SalesReportService) {}

  @Get('detail')
  @ApiOperation({ summary: 'Sổ chi tiết bán hàng' })
  detail(@Query() filter: SalesReportFilterDto) {
    return this.report.detail(filter)
  }

  @Get('by-item')
  @ApiOperation({ summary: 'Tổng hợp bán hàng theo mặt hàng' })
  byItem(@Query() filter: SalesReportFilterDto) {
    return this.report.byItem(filter)
  }

  @Get('receivable-summary')
  @ApiOperation({ summary: 'Tổng hợp công nợ phải thu khách hàng (TK 131)' })
  receivableSummary(@Query() filter: SalesReportFilterDto) {
    return this.report.receivableSummary(filter)
  }

  @Get('receivable-detail')
  @ApiOperation({ summary: 'Chi tiết công nợ phải thu khách hàng (TK 131)' })
  receivableDetail(@Query() filter: SalesReportFilterDto) {
    return this.report.receivableDetail(filter)
  }
}
