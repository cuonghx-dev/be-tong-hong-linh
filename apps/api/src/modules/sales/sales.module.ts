import { Module } from '@nestjs/common'
import { CustomerController } from './customer.controller'
import { CustomerService } from './customer.service'
import { ReceivableController } from './receivable.controller'
import { ReceivableService } from './receivable.service'
import { SalesController } from './sales.controller'
import { SalesService } from './sales.service'

@Module({
  controllers: [SalesController, CustomerController, ReceivableController],
  providers: [SalesService, CustomerService, ReceivableService],
  exports: [SalesService, CustomerService],
})
export class SalesModule {}
