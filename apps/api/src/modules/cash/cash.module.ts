import { Module } from '@nestjs/common'
import { CashReportController } from './cash-report.controller'
import { CashReportService } from './cash-report.service'
import { CashController } from './cash.controller'
import { CashService } from './cash.service'

@Module({
  controllers: [CashController, CashReportController],
  providers: [CashService, CashReportService],
  exports: [CashService],
})
export class CashModule {}
