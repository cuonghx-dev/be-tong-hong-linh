import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { BankReportService } from './bank-report.service'
import { BankBalanceFilterDto, BankReportFilterDto } from './dto/bank-report-filter.dto'

@ApiTags('bank')
@Controller('bank/reports')
export class BankReportController {
  constructor(private readonly report: BankReportService) {}

  @Get('bank-book')
  @ApiOperation({ summary: 'Sổ tiền gửi ngân hàng (theo từng TK ngân hàng)' })
  bankBook(@Query() filter: BankReportFilterDto) {
    return this.report.bankBook(filter)
  }

  @Get('account-balances')
  @ApiOperation({ summary: 'Bảng kê số dư ngân hàng' })
  accountBalances(@Query() filter: BankBalanceFilterDto) {
    return this.report.accountBalances(filter)
  }

  @Get('daily-balance')
  @ApiOperation({ summary: 'Bảng kê số dư tiền theo ngày (tiền gửi)' })
  dailyBalance(@Query() filter: BankReportFilterDto) {
    return this.report.dailyBalance(filter)
  }
}
