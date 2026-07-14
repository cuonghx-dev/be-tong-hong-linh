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
import { OrganizationUnitController } from './organization-unit.controller'
import { OrganizationUnitService } from './organization-unit.service'
import { PartnerGroupController } from './partner-group.controller'
import { PartnerGroupService } from './partner-group.service'
import { ProductGroupController } from './product-group.controller'
import { ProductGroupService } from './product-group.service'
import { ProductController } from './product.controller'
import { ProductService } from './product.service'
import { TransferAccountController } from './transfer-account.controller'
import { TransferAccountService } from './transfer-account.service'
import { UnitController } from './unit.controller'
import { UnitService } from './unit.service'
import { VoucherTypeController } from './voucher-type.controller'
import { VoucherTypeService } from './voucher-type.service'
import { WarehouseController } from './warehouse.controller'
import { WarehouseService } from './warehouse.service'

@Module({
  controllers: [
    AccountController,
    BankController,
    BankAccountController,
    CostObjectController,
    EmployeeController,
    ExpenseItemController,
    IncomeExpenseItemController,
    OrganizationUnitController,
    PartnerGroupController,
    ProductGroupController,
    ProductController,
    TransferAccountController,
    DefaultAccountController,
    VoucherTypeController,
    WarehouseController,
    UnitController,
  ],
  providers: [
    AccountService,
    BankService,
    BankAccountService,
    CostObjectService,
    EmployeeService,
    ExpenseItemService,
    IncomeExpenseItemService,
    OrganizationUnitService,
    PartnerGroupService,
    ProductGroupService,
    ProductService,
    TransferAccountService,
    DefaultAccountService,
    VoucherTypeService,
    WarehouseService,
    UnitService,
  ],
  exports: [
    AccountService,
    BankService,
    BankAccountService,
    CostObjectService,
    EmployeeService,
    ExpenseItemService,
    IncomeExpenseItemService,
    OrganizationUnitService,
    PartnerGroupService,
    ProductGroupService,
    ProductService,
    TransferAccountService,
    DefaultAccountService,
    VoucherTypeService,
    WarehouseService,
    UnitService,
  ],
})
export class CatalogModule {}
