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
import { CreateItemDto } from './dto/create-item.dto'
import { ItemFilterDto } from './dto/item-filter.dto'
import { UpdateItemDto } from './dto/update-item.dto'
import { ItemService } from './item.service'

@ApiTags('purchase')
@Controller('purchase/items')
export class ItemController {
  constructor(private readonly items: ItemService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách hàng hóa - dịch vụ (lọc + phân trang)' })
  list(@Query() filter: ItemFilterDto) {
    return this.items.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 hàng hóa - dịch vụ' })
  findOne(@Param('id') id: string) {
    return this.items.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm hàng hóa - dịch vụ' })
  create(@Body() dto: CreateItemDto) {
    return this.items.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu hàng hóa - dịch vụ từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.items.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa hàng hóa - dịch vụ' })
  update(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.items.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa hàng hóa - dịch vụ' })
  remove(@Param('id') id: string) {
    return this.items.remove(id)
  }
}
