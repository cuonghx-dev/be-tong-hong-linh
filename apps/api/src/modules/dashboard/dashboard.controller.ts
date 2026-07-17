import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'
import { FinancePeriodDto, TopQueryDto, YearQueryDto } from './dto/dashboard-query.dto'
import { Domain } from '../../common/decorators/domain.decorator'

@ApiTags('dashboard')
@Domain('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('finance')
  @ApiOperation({ summary: 'Tình hình tài chính (số dư + phát sinh trong kỳ)' })
  finance(@Query() query: FinancePeriodDto) {
    return this.dashboard.financeOverview(query.period)
  }

  @Get('receivable-aging')
  @ApiOperation({ summary: 'Nợ phải thu theo hạn (quá hạn / trong hạn)' })
  receivableAging() {
    return this.dashboard.receivableAging()
  }

  @Get('payable-aging')
  @ApiOperation({ summary: 'Nợ phải trả theo hạn (quá hạn / trong hạn)' })
  payableAging() {
    return this.dashboard.payableAging()
  }

  @Get('profit-loss')
  @ApiOperation({ summary: 'Doanh thu, chi phí, lợi nhuận theo tháng' })
  profitLoss(@Query() query: YearQueryDto) {
    return this.dashboard.profitLoss(query.year ?? new Date().getUTCFullYear())
  }

  @Get('cashflow')
  @ApiOperation({ summary: 'Dòng tiền thu/chi/tồn theo tháng' })
  cashflow(@Query() query: YearQueryDto) {
    return this.dashboard.cashflow(query.year ?? new Date().getUTCFullYear())
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Hàng hóa tồn kho — top mặt hàng theo giá trị' })
  inventory(@Query() query: TopQueryDto) {
    return this.dashboard.inventorySummary(query.limit ?? 5)
  }

  @Get('top-selling')
  @ApiOperation({ summary: 'Mặt hàng bán chạy — top theo doanh thu trong năm' })
  topSelling(@Query() query: TopQueryDto) {
    return this.dashboard.topSelling(query.year ?? new Date().getUTCFullYear(), query.limit ?? 5)
  }

  @Get('expenses')
  @ApiOperation({ summary: 'Cơ cấu chi phí theo nhóm TK trong năm' })
  expenses(@Query() query: YearQueryDto) {
    return this.dashboard.expenseBreakdown(query.year ?? new Date().getUTCFullYear())
  }
}
