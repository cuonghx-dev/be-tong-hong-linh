import { Module } from '@nestjs/common'
import { BookLockModule } from '../book-lock/book-lock.module'
import { BankReportController } from './bank-report.controller'
import { BankReportService } from './bank-report.service'
import { BankController } from './bank.controller'
import { BankService } from './bank.service'

@Module({
  imports: [BookLockModule],
  controllers: [BankController, BankReportController],
  providers: [BankService, BankReportService],
  exports: [BankService],
})
export class BankModule {}
