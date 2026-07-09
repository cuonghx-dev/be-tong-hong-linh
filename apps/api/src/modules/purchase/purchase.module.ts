import { Module } from '@nestjs/common'
import { PurchaseController } from './purchase.controller'
import { PurchaseService } from './purchase.service'
import { SupplierController } from './supplier.controller'
import { SupplierService } from './supplier.service'

@Module({
  controllers: [PurchaseController, SupplierController],
  providers: [PurchaseService, SupplierService],
  exports: [PurchaseService, SupplierService],
})
export class PurchaseModule {}
