import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ItemLedgerFilterDto, StockSummaryFilterDto } from './dto/inventory-report-filter.dto'
import { InventoryReportService } from './inventory-report.service'
import { Domain } from '../../common/decorators/domain.decorator'

@ApiTags('inventory')
@Domain('inventory')
@Controller('inventory/reports')
export class InventoryReportController {
  constructor(private readonly report: InventoryReportService) {}

  @Get('stock-summary')
  @ApiOperation({ summary: 'Tổng hợp tồn kho (theo VTHH)' })
  stockSummary(@Query() filter: StockSummaryFilterDto) {
    return this.report.stockSummary(filter)
  }

  @Get('item-ledger')
  @ApiOperation({ summary: 'Sổ chi tiết vật tư hàng hóa' })
  itemLedger(@Query() filter: ItemLedgerFilterDto) {
    return this.report.itemLedger(filter)
  }
}
