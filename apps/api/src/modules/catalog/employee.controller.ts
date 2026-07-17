import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreateEmployeeDto } from './dto/create-employee.dto'
import { EmployeeFilterDto } from './dto/employee-filter.dto'
import { UpdateEmployeeDto } from './dto/update-employee.dto'
import { EmployeeService } from './employee.service'
import { Domain } from '../../common/decorators/domain.decorator'

@ApiTags('catalog')
@Domain('catalog')
@Controller('catalog/employees')
export class EmployeeController {
  constructor(private readonly employees: EmployeeService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách nhân viên (lọc + phân trang)' })
  list(@Query() filter: EmployeeFilterDto) {
    return this.employees.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 nhân viên' })
  findOne(@Param('id') id: string) {
    return this.employees.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm nhân viên' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employees.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu nhân viên từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.employees.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa nhân viên' })
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employees.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa nhân viên' })
  remove(@Param('id') id: string) {
    return this.employees.remove(id)
  }
}
