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
import { CreateWarehouseDto } from './dto/create-warehouse.dto'
import { UpdateWarehouseDto } from './dto/update-warehouse.dto'
import { WarehouseFilterDto } from './dto/warehouse-filter.dto'
import { WarehouseService } from './warehouse.service'
import { Domain } from '../../common/decorators/domain.decorator'

@ApiTags('catalog')
@Domain('catalog')
@Controller('catalog/warehouses')
export class WarehouseController {
  constructor(private readonly warehouses: WarehouseService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách kho (lọc + phân trang)' })
  list(@Query() filter: WarehouseFilterDto) {
    return this.warehouses.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 kho' })
  findOne(@Param('id') id: string) {
    return this.warehouses.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm kho' })
  create(@Body() dto: CreateWarehouseDto) {
    return this.warehouses.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu kho từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.warehouses.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa kho' })
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.warehouses.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa kho' })
  remove(@Param('id') id: string) {
    return this.warehouses.remove(id)
  }
}
