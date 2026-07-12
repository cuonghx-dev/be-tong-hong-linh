import { Module } from '@nestjs/common'
import { BankReportController } from './bank-report.controller'
import { BankReportService } from './bank-report.service'
import { BankController } from './bank.controller'
import { BankService } from './bank.service'

@Module({
  controllers: [BankController, BankReportController],
  providers: [BankService, BankReportService],
  exports: [BankService],
})
export class BankModule {}
