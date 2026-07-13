import { Module } from '@nestjs/common'
import { GoodsIssueController } from './goods-issue.controller'
import { GoodsIssueService } from './goods-issue.service'
import { InventoryReportController } from './inventory-report.controller'
import { InventoryReportService } from './inventory-report.service'
import { ReceiptController } from './receipt.controller'
import { ReceiptService } from './receipt.service'

@Module({
  controllers: [ReceiptController, GoodsIssueController, InventoryReportController],
  providers: [ReceiptService, GoodsIssueService, InventoryReportService],
  exports: [ReceiptService, GoodsIssueService],
})
export class InventoryModule {}
