import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { CashReportService } from './cash-report.service'
import { CashReportFilterDto } from './dto/cash-report-filter.dto'

@ApiTags('cash')
@Controller('cash/reports')
export class CashReportController {
  constructor(private readonly report: CashReportService) {}

  @Get('receipt-journal')
  @ApiOperation({ summary: 'S03a1-DNN: Sổ nhật ký thu tiền' })
  receiptJournal(@Query() filter: CashReportFilterDto) {
    return this.report.receiptJournal(filter)
  }

  @Get('payment-journal')
  @ApiOperation({ summary: 'S03a2-DNN: Sổ nhật ký chi tiền' })
  paymentJournal(@Query() filter: CashReportFilterDto) {
    return this.report.paymentJournal(filter)
  }

  @Get('cash-book')
  @ApiOperation({ summary: 'Sổ kế toán chi tiết quỹ tiền mặt' })
  cashBook(@Query() filter: CashReportFilterDto) {
    return this.report.cashBook(filter)
  }

  @Get('daily-balance')
  @ApiOperation({ summary: 'Bảng kê số dư tiền theo ngày' })
  dailyBalance(@Query() filter: CashReportFilterDto) {
    return this.report.dailyBalance(filter)
  }
}
