import { Module } from '@nestjs/common'
import { OpeningBalanceController } from './opening-balance.controller'
import { OpeningBalanceService } from './opening-balance.service'

@Module({
  controllers: [OpeningBalanceController],
  providers: [OpeningBalanceService],
  exports: [OpeningBalanceService],
})
export class OpeningBalanceModule {}
