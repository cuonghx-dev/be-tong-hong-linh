import { Module } from '@nestjs/common'
import { AccountController } from './account.controller'
import { AccountService } from './account.service'
import { BankAccountController } from './bank-account.controller'
import { BankAccountService } from './bank-account.service'
import { BankController } from './bank.controller'
import { BankService } from './bank.service'
import { CostObjectController } from './cost-object.controller'
import { CostObjectService } from './cost-object.service'
import { DefaultAccountController } from './default-account.controller'
import { DefaultAccountService } from './default-account.service'
import { EmployeeController } from './employee.controller'
import { EmployeeService } from './employee.service'
import { ExpenseItemController } from './expense-item.controller'
import { ExpenseItemService } from './expense-item.service'
import { IncomeExpenseItemController } from './income-expense-item.controller'
import { IncomeExpenseItemService } from './income-expense-item.service'
import { PartnerGroupController } from './partner-group.controller'
import { PartnerGroupService } from './partner-group.service'
import { TransferAccountController } from './transfer-account.controller'
import { TransferAccountService } from './transfer-account.service'
import { VoucherTypeController } from './voucher-type.controller'
import { VoucherTypeService } from './voucher-type.service'

@Module({
  controllers: [
    AccountController,
    BankController,
    BankAccountController,
    CostObjectController,
    EmployeeController,
    ExpenseItemController,
    IncomeExpenseItemController,
    PartnerGroupController,
    TransferAccountController,
    DefaultAccountController,
    VoucherTypeController,
  ],
  providers: [
    AccountService,
    BankService,
    BankAccountService,
    CostObjectService,
    EmployeeService,
    ExpenseItemService,
    IncomeExpenseItemService,
    PartnerGroupService,
    TransferAccountService,
    DefaultAccountService,
    VoucherTypeService,
  ],
  exports: [
    AccountService,
    BankService,
    BankAccountService,
    CostObjectService,
    EmployeeService,
    ExpenseItemService,
    IncomeExpenseItemService,
    PartnerGroupService,
    TransferAccountService,
    DefaultAccountService,
    VoucherTypeService,
  ],
})
export class CatalogModule {}
