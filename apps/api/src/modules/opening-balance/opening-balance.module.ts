import { Module } from '@nestjs/common'
import { BookLockModule } from '../book-lock/book-lock.module'
import { OpeningBalanceController } from './opening-balance.controller'
import { OpeningBalanceService } from './opening-balance.service'

@Module({
  imports: [BookLockModule],
  controllers: [OpeningBalanceController],
  providers: [OpeningBalanceService],
  exports: [OpeningBalanceService],
})
export class OpeningBalanceModule {}
