import { Module } from '@nestjs/common'
import { CostObjectController } from './cost-object.controller'
import { CostObjectService } from './cost-object.service'
import { EmployeeController } from './employee.controller'
import { EmployeeService } from './employee.service'
import { ExpenseItemController } from './expense-item.controller'
import { ExpenseItemService } from './expense-item.service'
import { PartnerGroupController } from './partner-group.controller'
import { PartnerGroupService } from './partner-group.service'

@Module({
  controllers: [
    CostObjectController,
    EmployeeController,
    ExpenseItemController,
    PartnerGroupController,
  ],
  providers: [CostObjectService, EmployeeService, ExpenseItemService, PartnerGroupService],
  exports: [CostObjectService, EmployeeService, ExpenseItemService, PartnerGroupService],
})
export class CatalogModule {}
