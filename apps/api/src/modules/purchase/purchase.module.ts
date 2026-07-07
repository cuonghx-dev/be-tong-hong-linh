import { Module } from '@nestjs/common'
import { ItemController } from './item.controller'
import { ItemService } from './item.service'
import { PurchaseController } from './purchase.controller'
import { PurchaseService } from './purchase.service'
import { SupplierController } from './supplier.controller'
import { SupplierService } from './supplier.service'

@Module({
  controllers: [PurchaseController, SupplierController, ItemController],
  providers: [PurchaseService, SupplierService, ItemService],
  exports: [PurchaseService, SupplierService, ItemService],
})
export class PurchaseModule {}
