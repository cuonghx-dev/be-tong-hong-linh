import { Module } from '@nestjs/common'
import { BookLockModule } from '../book-lock/book-lock.module'
import { BankModule } from '../bank/bank.module'
import { CashModule } from '../cash/cash.module'
import { InventoryModule } from '../inventory/inventory.module'
import { CustomerController } from './customer.controller'
import { CustomerService } from './customer.service'
import { ReceivableController } from './receivable.controller'
import { ReceivableService } from './receivable.service'
import { SalesReportController } from './sales-report.controller'
import { SalesReportService } from './sales-report.service'
import { SalesController } from './sales.controller'
import { SalesService } from './sales.service'

@Module({
  imports: [BookLockModule, CashModule, BankModule, InventoryModule],
  controllers: [SalesController, CustomerController, ReceivableController, SalesReportController],
  providers: [SalesService, CustomerService, ReceivableService, SalesReportService],
  exports: [SalesService, CustomerService],
})
export class SalesModule {}
