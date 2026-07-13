import { Module } from '@nestjs/common'
<<<<<<< Updated upstream
=======
import { BookLockModule } from '../book-lock/book-lock.module'
import { PayableController } from './payable.controller'
import { PayableService } from './payable.service'
>>>>>>> Stashed changes
import { PurchaseReportController } from './purchase-report.controller'
import { PurchaseReportService } from './purchase-report.service'
import { PurchaseController } from './purchase.controller'
import { PurchaseService } from './purchase.service'
import { SupplierController } from './supplier.controller'
import { SupplierService } from './supplier.service'

@Module({
<<<<<<< Updated upstream
  controllers: [PurchaseController, SupplierController, PurchaseReportController],
  providers: [PurchaseService, SupplierService, PurchaseReportService],
=======
  imports: [BookLockModule],
  controllers: [PurchaseController, SupplierController, PurchaseReportController, PayableController],
  providers: [PurchaseService, SupplierService, PurchaseReportService, PayableService],
>>>>>>> Stashed changes
  exports: [PurchaseService, SupplierService],
})
export class PurchaseModule {}
