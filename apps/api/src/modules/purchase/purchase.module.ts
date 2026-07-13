import { Module } from '@nestjs/common'
import { PayableController } from './payable.controller'
import { PayableService } from './payable.service'
import { PurchaseReportController } from './purchase-report.controller'
import { PurchaseReportService } from './purchase-report.service'
import { PurchaseController } from './purchase.controller'
import { PurchaseService } from './purchase.service'
import { SupplierController } from './supplier.controller'
import { SupplierService } from './supplier.service'

@Module({
  controllers: [PurchaseController, SupplierController, PurchaseReportController, PayableController],
  providers: [PurchaseService, SupplierService, PurchaseReportService, PayableService],
  exports: [PurchaseService, SupplierService],
})
export class PurchaseModule {}
