import { Module } from '@nestjs/common'
import { GoodsIssueController } from './goods-issue.controller'
import { GoodsIssueService } from './goods-issue.service'
import { ReceiptController } from './receipt.controller'
import { ReceiptService } from './receipt.service'

@Module({
  controllers: [ReceiptController, GoodsIssueController],
  providers: [ReceiptService, GoodsIssueService],
  exports: [ReceiptService, GoodsIssueService],
})
export class InventoryModule {}
