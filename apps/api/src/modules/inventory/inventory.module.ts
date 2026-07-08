import { Module } from '@nestjs/common'
import { GoodsIssueController } from './goods-issue.controller'
import { GoodsIssueService } from './goods-issue.service'
import { ProductionOrderController } from './production-order.controller'
import { ProductionOrderService } from './production-order.service'
import { ReceiptController } from './receipt.controller'
import { ReceiptService } from './receipt.service'

@Module({
  controllers: [ReceiptController, GoodsIssueController, ProductionOrderController],
  providers: [ReceiptService, GoodsIssueService, ProductionOrderService],
  exports: [ReceiptService, GoodsIssueService, ProductionOrderService],
})
export class InventoryModule {}
