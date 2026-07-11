import { Module } from '@nestjs/common'
import { AccountController } from './account.controller'
import { AccountService } from './account.service'
import { BankAccountController } from './bank-account.controller'
import { BankAccountService } from './bank-account.service'
import { BankController } from './bank.controller'
import { BankService } from './bank.service'
import { CostObjectController } from './cost-object.controller'
import { CostObjectService } from './cost-object.service'
import { EmployeeController } from './employee.controller'
import { EmployeeService } from './employee.service'
import { ExpenseItemController } from './expense-item.controller'
import { ExpenseItemService } from './expense-item.service'
import { PartnerGroupController } from './partner-group.controller'
import { PartnerGroupService } from './partner-group.service'
import { TransferAccountController } from './transfer-account.controller'
import { TransferAccountService } from './transfer-account.service'

@Module({
  controllers: [
    AccountController,
    BankController,
    BankAccountController,
    CostObjectController,
    EmployeeController,
    ExpenseItemController,
    PartnerGroupController,
    TransferAccountController,
  ],
  providers: [
    AccountService,
    BankService,
    BankAccountService,
    CostObjectService,
    EmployeeService,
    ExpenseItemService,
    PartnerGroupService,
    TransferAccountService,
  ],
  exports: [
    AccountService,
    BankService,
    BankAccountService,
    CostObjectService,
    EmployeeService,
    ExpenseItemService,
    PartnerGroupService,
    TransferAccountService,
  ],
})
export class CatalogModule {}
