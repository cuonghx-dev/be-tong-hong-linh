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
import { CreateUnitDto } from './dto/create-unit.dto'
import { UnitFilterDto } from './dto/unit-filter.dto'
import { UpdateUnitDto } from './dto/update-unit.dto'
import { UnitService } from './unit.service'

@ApiTags('catalog')
@Controller('catalog/units')
export class UnitController {
  constructor(private readonly units: UnitService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách đơn vị tính (lọc + phân trang)' })
  list(@Query() filter: UnitFilterDto) {
    return this.units.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 đơn vị tính' })
  findOne(@Param('id') id: string) {
    return this.units.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm đơn vị tính' })
  create(@Body() dto: CreateUnitDto) {
    return this.units.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu đơn vị tính từ file Excel (.xlsx)' })
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
  @ApiOperation({ summary: 'Sửa đơn vị tính' })
  update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.units.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa đơn vị tính' })
  remove(@Param('id') id: string) {
    return this.units.remove(id)
  }
}
