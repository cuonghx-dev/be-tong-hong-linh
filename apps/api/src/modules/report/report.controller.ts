import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { AccountLedgerFilterDto, GeneralJournalFilterDto } from './dto/report-filter.dto'
import { ReportService } from './report.service'

@ApiTags('reports')
@Controller('reports')
export class ReportController {
  constructor(private readonly report: ReportService) {}

  @Get('general-journal')
  @ApiOperation({ summary: 'S03a-DNN: Sổ nhật ký chung' })
  generalJournal(@Query() filter: GeneralJournalFilterDto) {
    return this.report.generalJournal(filter)
  }

  @Get('account-ledger')
  @ApiOperation({ summary: 'S03b-DNN: Sổ chi tiết các tài khoản' })
  accountLedger(@Query() filter: AccountLedgerFilterDto) {
    return this.report.accountLedger(filter)
  }
}
