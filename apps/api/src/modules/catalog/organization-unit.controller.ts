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
import { CreateOrganizationUnitDto } from './dto/create-organization-unit.dto'
import { OrganizationUnitFilterDto } from './dto/organization-unit-filter.dto'
import { UpdateOrganizationUnitDto } from './dto/update-organization-unit.dto'
import { OrganizationUnitService } from './organization-unit.service'
import { Domain } from '../../common/decorators/domain.decorator'

@ApiTags('catalog')
@Domain('catalog')
@Controller('catalog/organization-units')
export class OrganizationUnitController {
  constructor(private readonly units: OrganizationUnitService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách cơ cấu tổ chức (lọc + phân trang)' })
  list(@Query() filter: OrganizationUnitFilterDto) {
    return this.units.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 đơn vị' })
  findOne(@Param('id') id: string) {
    return this.units.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm đơn vị' })
  create(@Body() dto: CreateOrganizationUnitDto) {
    return this.units.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu cơ cấu tổ chức từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.units.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa đơn vị' })
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationUnitDto) {
    return this.units.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa đơn vị' })
  remove(@Param('id') id: string) {
    return this.units.remove(id)
  }
}
