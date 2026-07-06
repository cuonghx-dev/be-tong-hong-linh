import { Module } from '@nestjs/common'
import { CustomerController } from './customer.controller'
import { CustomerService } from './customer.service'
import { InvoiceController } from './invoice.controller'
import { InvoiceService } from './invoice.service'
import { ReceivableController } from './receivable.controller'
import { ReceivableService } from './receivable.service'
import { SalesController } from './sales.controller'
import { SalesService } from './sales.service'

@Module({
  controllers: [SalesController, CustomerController, InvoiceController, ReceivableController],
  providers: [SalesService, CustomerService, InvoiceService, ReceivableService],
  exports: [SalesService, CustomerService, InvoiceService],
})
export class SalesModule {}
