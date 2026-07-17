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
import { CreateProductGroupDto } from './dto/create-product-group.dto'
import { ProductGroupFilterDto } from './dto/product-group-filter.dto'
import { UpdateProductGroupDto } from './dto/update-product-group.dto'
import { ProductGroupService } from './product-group.service'
import { Domain } from '../../common/decorators/domain.decorator'

@ApiTags('catalog')
@Domain('catalog')
@Controller('catalog/product-groups')
export class ProductGroupController {
  constructor(private readonly groups: ProductGroupService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách nhóm VTHH (lọc + phân trang)' })
  list(@Query() filter: ProductGroupFilterDto) {
    return this.groups.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 nhóm VTHH' })
  findOne(@Param('id') id: string) {
    return this.groups.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm nhóm VTHH' })
  create(@Body() dto: CreateProductGroupDto) {
    return this.groups.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu nhóm VTHH từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.groups.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa nhóm VTHH' })
  update(@Param('id') id: string, @Body() dto: UpdateProductGroupDto) {
    return this.groups.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa nhóm VTHH' })
  remove(@Param('id') id: string) {
    return this.groups.remove(id)
  }
}
