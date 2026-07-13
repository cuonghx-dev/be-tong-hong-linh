import { Module } from '@nestjs/common'
import { BookLockModule } from '../book-lock/book-lock.module'
import { CashReportController } from './cash-report.controller'
import { CashReportService } from './cash-report.service'
import { CashController } from './cash.controller'
import { CashService } from './cash.service'

@Module({
  imports: [BookLockModule],
  controllers: [CashController, CashReportController],
  providers: [CashService, CashReportService],
  exports: [CashService],
})
export class CashModule {}
