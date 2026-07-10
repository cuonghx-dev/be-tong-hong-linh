import { Module } from '@nestjs/common'
import { EmployeeController } from './employee.controller'
import { EmployeeService } from './employee.service'
import { PartnerGroupController } from './partner-group.controller'
import { PartnerGroupService } from './partner-group.service'

@Module({
  controllers: [EmployeeController, PartnerGroupController],
  providers: [EmployeeService, PartnerGroupService],
  exports: [EmployeeService, PartnerGroupService],
})
export class CatalogModule {}
