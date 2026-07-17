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
import { CostObjectService } from './cost-object.service'
import { CostObjectFilterDto } from './dto/cost-object-filter.dto'
import { CreateCostObjectDto } from './dto/create-cost-object.dto'
import { UpdateCostObjectDto } from './dto/update-cost-object.dto'
import { Domain } from '../../common/decorators/domain.decorator'

@ApiTags('catalog')
@Domain('catalog')
@Controller('catalog/cost-objects')
export class CostObjectController {
  constructor(private readonly costObjects: CostObjectService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách đối tượng THCP (lọc + phân trang)' })
  list(@Query() filter: CostObjectFilterDto) {
    return this.costObjects.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 đối tượng THCP' })
  findOne(@Param('id') id: string) {
    return this.costObjects.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm đối tượng THCP' })
  create(@Body() dto: CreateCostObjectDto) {
    return this.costObjects.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu đối tượng THCP từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.costObjects.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa đối tượng THCP' })
  update(@Param('id') id: string, @Body() dto: UpdateCostObjectDto) {
    return this.costObjects.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa đối tượng THCP' })
  remove(@Param('id') id: string) {
    return this.costObjects.remove(id)
  }
}
