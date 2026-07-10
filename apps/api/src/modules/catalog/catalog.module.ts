import { Module } from '@nestjs/common'
import { CostObjectController } from './cost-object.controller'
import { CostObjectService } from './cost-object.service'
import { EmployeeController } from './employee.controller'
import { EmployeeService } from './employee.service'
import { PartnerGroupController } from './partner-group.controller'
import { PartnerGroupService } from './partner-group.service'

@Module({
  controllers: [CostObjectController, EmployeeController, PartnerGroupController],
  providers: [CostObjectService, EmployeeService, PartnerGroupService],
  exports: [CostObjectService, EmployeeService, PartnerGroupService],
})
export class CatalogModule {}
