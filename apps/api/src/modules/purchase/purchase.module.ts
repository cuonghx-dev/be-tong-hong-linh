import { Module } from '@nestjs/common'
import { BookLockModule } from '../book-lock/book-lock.module'
import { PurchaseReportController } from './purchase-report.controller'
import { PurchaseReportService } from './purchase-report.service'
import { PurchaseController } from './purchase.controller'
import { PurchaseService } from './purchase.service'
import { SupplierController } from './supplier.controller'
import { SupplierService } from './supplier.service'

@Module({
  imports: [BookLockModule],
  controllers: [PurchaseController, SupplierController, PurchaseReportController],
  providers: [PurchaseService, SupplierService, PurchaseReportService],
  exports: [PurchaseService, SupplierService],
})
export class PurchaseModule {}
